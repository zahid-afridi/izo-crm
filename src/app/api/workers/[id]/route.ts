import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encryptPassword, decryptPassword } from '@/lib/password-utils';
import { normalizeWorkerRemoveStatus } from '@/lib/workerRemoveStatus';

// GET worker by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const worker = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        idNumber: true,
        address: true,
        role: true,
        status: true,
        password: true,
        profile: true, // Include profile field which contains encrypted password
        createdAt: true,
        updatedAt: true,
        worker: {
          select: {
            id: true,
            employeeType: true,
            hourlyRate: true,
            monthlyRate: true,
            removeStatus: true,
          },
        },
      },
    });

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Decrypt the password for display
    const decryptedPassword = worker.profile ? decryptPassword(worker.profile) : '123456';
    
    return NextResponse.json({ 
      worker: {
        ...worker,
        plainPassword: decryptedPassword
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching worker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker' },
      { status: 500 }
    );
  }
}

// PATCH update specific worker fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      role,
      removeStatus: removeStatusRaw,
      updatedByUserId,
    } = body;
    const removeStatus = removeStatusRaw
      ? normalizeWorkerRemoveStatus(removeStatusRaw)
      : undefined;

    // Check if worker exists
    const existingWorker = await prisma.users.findUnique({
      where: { id },
      include: { worker: true },
    });

    if (!existingWorker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Update user and worker
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      let worker = existingWorker.worker;

      // Update role if provided
      if (role) {
        updateData.role = role;
      }

      // Update user if there are user fields to update
      let user = existingWorker;
      if (Object.keys(updateData).length > 0) {
        user = await tx.users.update({
          where: { id },
          data: updateData,
          include: {
            worker: true, // Include worker relation to match the expected type
          },
        });
      }

      // Update worker status if provided
      if (removeStatus) {
        if (existingWorker.worker) {
          // Update existing worker record
          worker = await tx.worker.update({
            where: { userId: id },
            data: { removeStatus },
          });
        } else {
          // Create new worker record if it doesn't exist
          worker = await tx.worker.create({
            data: {
              userId: id,
              employeeType: 'full-time',
              removeStatus,
            },
          });
        }
      }

      // Log activity - Quick field update
      if (updatedByUserId) {
        try {
          const ipAddress = request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || 
                           'Unknown';
          const userAgent = request.headers.get('user-agent') || 'Unknown';

          const changes = [];
          if (role) changes.push(`role to ${role}`);
          if (removeStatus) changes.push(`status to ${removeStatus}`);

          await tx.activityLog.create({
            data: {
              userId: updatedByUserId,
              action: 'update',
              module: 'Workers',
              description: `Quick updated worker "${existingWorker.fullName}" - changed ${changes.join(', ')}`,
              entityId: id,
              entityType: 'Worker',
              ipAddress,
              userAgent,
              oldValues: {
                role: existingWorker.role,
                removeStatus: existingWorker.worker?.removeStatus,
              },
              newValues: {
                role,
                removeStatus,
              },
            },
          });
        } catch (logError) {
          console.error('Error logging activity:', logError);
          // Don't fail the update if activity logging fails
        }
      }

      return { user, worker };
    });

    return NextResponse.json(
      { message: 'Worker updated successfully', data: result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating worker field:', error);
    return NextResponse.json(
      { error: 'Failed to update worker field' },
      { status: 500 }
    );
  }
}

// PUT update worker
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      idNumber,
      address,
      role,
      employeeType,
      removeStatus: removeStatusPutRaw,
      hourlyRate,
      monthlyRate,
      password,
      isLocked,
      updatedByUserId,
    } = body;
    const removeStatus = removeStatusPutRaw
      ? normalizeWorkerRemoveStatus(removeStatusPutRaw)
      : undefined;

    // Check if worker exists
    const existingWorker = await prisma.users.findUnique({
      where: { id },
      include: { worker: true },
    });

    if (!existingWorker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingWorker.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update user and worker
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
      if (idNumber) updateData.idNumber = idNumber;
      if (address) updateData.address = address;
      if (role) updateData.role = role;
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
        updateData.profile = encryptPassword(password); // Store encrypted password in profile
      }
      if (isLocked !== undefined) updateData.isLocked = isLocked;

      const user = await tx.users.update({
        where: { id },
        data: updateData,
        include: {
          worker: true, // Include worker relation to match the expected type
        },
      });

      let worker = existingWorker.worker;
      if (employeeType || removeStatus || hourlyRate || monthlyRate) {
        const workerUpdateData: any = {};
        if (employeeType) workerUpdateData.employeeType = employeeType;
        if (removeStatus) workerUpdateData.removeStatus = removeStatus;
        if (hourlyRate) workerUpdateData.hourlyRate = parseFloat(hourlyRate);
        if (monthlyRate) workerUpdateData.monthlyRate = parseFloat(monthlyRate);

        // Check if worker record exists
        if (existingWorker.worker) {
          // Update existing worker record
          worker = await tx.worker.update({
            where: { userId: id },
            data: workerUpdateData,
          });
        } else {
          // Create new worker record if it doesn't exist
          worker = await tx.worker.create({
            data: {
              userId: id,
              employeeType: employeeType || 'full-time',
              removeStatus: normalizeWorkerRemoveStatus(removeStatus || 'active'),
              hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
              monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
            },
          });
        }
      }

      // Log activity - Worker update
      if (updatedByUserId) {
        try {
          const ipAddress = request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || 
                           'Unknown';
          const userAgent = request.headers.get('user-agent') || 'Unknown';

          await tx.activityLog.create({
            data: {
              userId: updatedByUserId,
              action: 'update',
              module: 'Workers',
              description: `Updated worker "${fullName || existingWorker.fullName}"`,
              entityId: id,
              entityType: 'Worker',
              ipAddress,
              userAgent,
              oldValues: {
                fullName: existingWorker.fullName,
                email: existingWorker.email,
                employeeType: existingWorker.worker?.employeeType,
              },
              newValues: {
                fullName,
                email,
                employeeType,
              },
            },
          });
        } catch (logError) {
          console.error('Error logging activity:', logError);
          // Don't fail the update if activity logging fails
        }
      }

      return { user, worker };
    });

    return NextResponse.json(
      { message: 'Worker updated successfully', data: result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating worker:', error);
    return NextResponse.json(
      { error: 'Failed to update worker' },
      { status: 500 }
    );
  }
}

// DELETE worker
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { deletedByUserId } = body;

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        worker: true, // Include worker relation to check if it exists
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete worker record (if exists) and user in transaction
    await prisma.$transaction(async (tx) => {
      // Get counts before deletion for logging
      const teamsWithUser = await tx.team.findMany({
        where: {
          memberIds: {
            has: id
          }
        }
      });

      const teamsLedByUserCount = await tx.team.count({
        where: { teamLeadId: id }
      });

      // 1. Remove user from all teams where they are a member
      for (const team of teamsWithUser) {
        const updatedMemberIds = team.memberIds.filter(memberId => memberId !== id);
        await tx.team.update({
          where: { id: team.id },
          data: { memberIds: updatedMemberIds }
        });
      }

      // 2. Delete teams where this user is the team lead
      // (Simpler approach: delete teams rather than reassign leadership during deletion)
      await tx.team.deleteMany({
        where: { teamLeadId: id }
      });

      // 3. Delete all assignments for this worker
      await tx.assignment.deleteMany({
        where: { workerId: id }
      });

      // 4. Delete worker record if it exists
      if (user.worker) {
        await tx.worker.delete({
          where: { userId: id },
        });
      }

      // 5. Finally, delete the user
      await tx.users.delete({
        where: { id },
      });

      // Log activity - Worker deletion
      if (deletedByUserId) {
        try {
          const ipAddress = request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || 
                           'Unknown';
          const userAgent = request.headers.get('user-agent') || 'Unknown';

          const deletionDetails = [];
          if (teamsWithUser.length > 0) {
            deletionDetails.push(`Removed from ${teamsWithUser.length} team(s) as member`);
          }
          
          if (teamsLedByUserCount > 0) {
            deletionDetails.push(`Deleted ${teamsLedByUserCount} team(s) where user was team lead`);
          }

          await tx.activityLog.create({
            data: {
              userId: deletedByUserId,
              action: 'delete',
              module: 'Workers',
              description: `Deleted ${user.worker ? 'worker' : 'user'} "${user.fullName}"${deletionDetails.length > 0 ? '. ' + deletionDetails.join(', ') : ''}`,
              entityId: id,
              entityType: user.worker ? 'Worker' : 'User',
              ipAddress,
              userAgent,
              oldValues: {
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                teamsAsMember: teamsWithUser.length,
                teamsAsLead: teamsLedByUserCount,
              },
            },
          });
        } catch (logError) {
          console.error('Error logging activity:', logError);
          // Don't fail the delete if activity logging fails
        }
      }
    });

    return NextResponse.json(
      { 
        message: `${user.worker ? 'Worker' : 'User'} deleted successfully`,
        details: 'Removed from all teams and assignments'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting worker:', error);
    return NextResponse.json(
      { error: 'Failed to delete worker' },
      { status: 500 }
    );
  }
}
