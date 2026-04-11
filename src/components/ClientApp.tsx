'use client';

import { useState } from "react";
import { Sidebar } from "./layout/Sidebar";
import { Header } from "./layout/Header";
import { LoginPage } from "./auth/LoginPage";
import { MobileApp } from "./mobile/MobileApp";
import { Dashboard } from "./Dashboard";
import { ProductsPage } from "./pages/ProductsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { SitesPage } from "./pages/SitesPage";
import { WorkersPage } from "./pages/WorkersPage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { TeamsPage } from "./pages/TeamsPage";
import { TeamManagementPage } from "./pages/TeamManagementPage";
import { OffersPage } from "./pages/OffersPage_Enhanced";
import { ServicePackagesPage } from "./pages/ServicePackagesPage";
import { ClientsPage } from "./pages/ClientsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderManagementPage } from "./pages/OrderManagementPage";
import { WebsiteManagerPage } from "./pages/WebsiteManagerPage";
import { ChatPage } from "./pages/ChatPage";
import { RolesPage } from "./pages/RolesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ActivityLogPage } from "./pages/ActivityLogPage";
import { ExportUIDialog } from "./ExportUIDialog";
import { canAccessPage, getRoleInfo } from "@/config/rolePermissions";

// Site Manager Pages
import { SiteManagerDashboard } from "./pages/SiteManagerDashboard";
import { SitesManagement } from "./pages/SitesManagement";
import { CarsManagement } from "./pages/CarsManagement";
import { WorkersManagement } from "./pages/WorkersManagement";
import { CreateAssignment } from "./pages/CreateAssignment";
import { SiteReports } from "./pages/SiteReports";
import { WorkerLocationTracking } from "./pages/WorkerLocationTracking";

// Worker Pages
import { WorkerDashboard } from "./pages/WorkerDashboard";
import { WorkerChat } from "./pages/WorkerChat";

// Mobile Worker View
import { MobileWorkerView } from "./mobile/MobileWorkerView";

export default function ClientApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUser, setCurrentUser] = useState({ id: "", username: "", fullName: "" });
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleLogin = async (email: string, password: string) => {
    // For now, default to admin role - this should be replaced with actual authentication
    const role = 'admin';

    setIsAuthenticated(true);
    setCurrentUserRole(role);
    setCurrentUser({
      id: email, // Using email as ID for now
      username: email,
      fullName: getRoleInfo(role)?.label || email
    });

    // Set default page to dashboard
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUserRole("");
    setCurrentUser({ id: "", username: "", fullName: "" });
    setCurrentPage("dashboard");
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard userRole={currentUserRole} />;
      case "products":
        return <ProductsPage userRole={currentUserRole} />;
      case "services":
        return <ServicesPage userRole={currentUserRole} />;
      case "sites":
        return <SitesPage userRole={currentUserRole} />;
      case "workers":
        return <WorkersPage userRole={currentUserRole} />;
      case "assignments":
        return <AssignmentsPage userRole={currentUserRole} />;
      case "teams":
        return <TeamsPage userRole={currentUserRole} />;
      case "team-management":
        return <TeamManagementPage />;
      case "offers":
        return <OffersPage userRole={currentUserRole} />;
      case "service-packages":
        return <ServicePackagesPage userRole={currentUserRole} />;
      case "clients":
        return <ClientsPage userRole={currentUserRole} />;
      case "orders":
        return <OrdersPage userRole={currentUserRole} />;
      case "order-management":
        return <OrderManagementPage />;
      case "website-manager":
        return <WebsiteManagerPage userRole={currentUserRole} />;
      case "chat":
        return <ChatPage userRole={currentUserRole} />;
      case "roles":
        return <RolesPage userRole={currentUserRole} />;
      case "reports":
        return <ReportsPage userRole={currentUserRole} />;
      case "activity-log":
        return <ActivityLogPage userRole={currentUserRole} />;
      case "settings":
        return <SettingsPage userRole={currentUserRole} />;
      // Site Manager Pages
      case "site-manager-dashboard":
        return <SiteManagerDashboard userRole={currentUserRole} />;
      case "sites-management":
        return <SitesManagement userRole={currentUserRole} />;
      case "cars-management":
        return <CarsManagement userRole={currentUserRole} />;
      case "workers-management":
        return <WorkersManagement userRole={currentUserRole} />;
      case "create-assignment":
        return <CreateAssignment userRole={currentUserRole} />;
      case "site-reports":
        return <SiteReports userRole={currentUserRole} />;
      case "worker-location-tracking":
        return <WorkerLocationTracking userRole={currentUserRole} />;
      // Worker Pages
      case "worker-dashboard":
        return <WorkerDashboard userRole={currentUserRole} />;
      case "worker-chat":
        return <WorkerChat userRole={currentUserRole} userId={currentUser.id} userName={currentUser.fullName} />;
      default:
        return <Dashboard userRole={currentUserRole} />;
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show mobile app for managers on mobile devices
  const isManager = ['admin', 'product_manager', 'site_manager', 'offer_manager', 'order_manager', 'website_manager'].includes(currentUserRole);

  // Workers always use mobile view
  if (currentUserRole === 'worker') {
    return <MobileWorkerView />;
  }

  if (viewMode === 'mobile' && isManager) {
    return (
      <div className="relative">
        {/* View Mode Toggle */}
        <button
          onClick={() => setViewMode('desktop')}
          className="fixed top-4 right-4 z-50 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg text-xs border border-gray-200"
        >
          Switch to Desktop
        </button>
        <MobileApp
          userRole={currentUserRole}
          onLogout={handleLogout}
          userName={currentUser.fullName}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* View Mode Toggle for Managers */}
      {isManager && (
        <button
          onClick={() => setViewMode(viewMode === 'desktop' ? 'mobile' : 'desktop')}
          className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm hover:bg-blue-700"
        >
          Switch to Mobile View
        </button>
      )}

      <Sidebar
        currentPage={currentPage}
        setCurrentPage={handlePageChange}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"
          }`}
      >
        <Header
          currentPage={currentPage}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          userRole={currentUserRole}
          onExportUI={() => setIsExportDialogOpen(true)}
          onLogout={handleLogout}
          currentUser={currentUser}
          onNavigate={handlePageChange}
        />
        <main className="flex-1 p-6">{renderPage()}</main>
      </div>
      <ExportUIDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        currentPage={currentPage}
        setCurrentPage={handlePageChange}
        userRole={currentUserRole}
      />
    </div>
  );
}
