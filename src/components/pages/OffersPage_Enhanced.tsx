"use client";

import { useState, useEffect } from 'react';
import { useOffers } from '@/hooks/useOffers';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Search, Download, MoreVertical, Eye, Send, Package, X, ArrowRight, Mail, FileText, Printer, Trash2, Loader, AlertTriangle } from 'lucide-react';
import { getDocumentFiles, countDocumentFiles } from '@/lib/offers/documents';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { OfferExportDialog } from './OfferExportDialog';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';

interface OffersPageProps {
  userRole: string;
}

interface Offer {
  id: string;
  offerNumber: string;
  client: string;
  clientId?: string;
  title: string;
  offerDate: string;
  validUntil?: string | null;
  totalAmount: number;
  offerStatus: string;
  effectiveStatus?: string;
  items: any[];
  currency: string;
  subtotal: number;
  discount: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  validityPeriod?: string;
  notes?: string;
  createdAt: string;
}

interface OfferItem {
  type: 'product' | 'service' | 'service_package';
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  packageItems?: any[];
  fromPackage?: string;
  packageId?: string;
}

export function OffersPage({ userRole }: OffersPageProps) {
  const { t } = useTranslation();
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || 'IzoGrup';
  const companyTagline = shell.tagline?.trim() || 'Construction mangement system';
  const {
    filteredOffers: offers,
    isLoading: isInitialLoading,
    isInitialized,
    fetchOffers: dispatchFetchOffers,
    createOffer: dispatchCreateOffer,
    updateOffer: dispatchUpdateOffer,
    deleteOffer: dispatchDeleteOffer,
  } = useOffers();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('details');
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [offerItems, setOfferItems] = useState<OfferItem[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedOfferForView, setSelectedOfferForView] = useState<Offer | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedOfferForDelete, setSelectedOfferForDelete] = useState<Offer | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number; openUpward: boolean } | null>(null);
  const [dropdownType, setDropdownType] = useState<'email' | 'actions' | null>(null);
  const [isSharing, setIsSharing] = useState<string | null>(null); // Track which offer is being shared
  const [showEmailModalAfterSave, setShowEmailModalAfterSave] = useState(false); // Track if we should show email modal after save
  const [savedOfferForEmail, setSavedOfferForEmail] = useState<Offer | null>(null); // Store saved offer for email sharing
  const [isCreatingOffer, setIsCreatingOffer] = useState(false); // Track offer creation state
  const [isUpdatingField, setIsUpdatingField] = useState<string | null>(null); // For loading states
  const [offerData, setOfferData] = useState({
    client: '',
    clientId: '',
    title: '',
    offerDate: new Date().toISOString().split('T')[0],
    currency: 'usd',
    offerStatus: 'draft',
    paymentTerms: 'Payment within 30 days from invoice date.',
    deliveryTerms: 'Delivery within 5-7 business days after order confirmation.',
    validityPeriod: 'This offer is valid for 30 days from the date above.',
    notes: '',
  });

  const canEdit = ['admin', 'offer_manager'].includes(userRole);
  const canDelete = ['admin', 'offer_manager'].includes(userRole);
  const canView = ['admin', 'offer_manager', 'site_manager'].includes(userRole);

  const displayOfferStatus = (offer: Offer) => offer.effectiveStatus ?? offer.offerStatus;

  // Function to get currency symbol
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'usd':
        return '$';
      case 'all':
        return 'Lek ';
      case 'eur':
      default:
        return '€';
    }
  };

  useEffect(() => {
    if (!isInitialized) dispatchFetchOffers({ status: statusFilter });
    fetchClients();
    fetchProducts();
    fetchServices();
    fetchPackages();
  }, []);

  // Refresh offers when status filter changes
  useEffect(() => {
    dispatchFetchOffers({ status: statusFilter });
  }, [statusFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    const handleScroll = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openDropdownId) {
        closeDropdown();
      }
    };

    const handleResize = () => {
      if (openDropdownId) {
        closeDropdown();
      }
    };

    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [openDropdownId]);

  // Validation functions
  const validateDetailsTab = () => {
    const errors: string[] = [];
    if (!offerData.clientId) errors.push(t('offers.clientRequired'));
    if (!offerData.title.trim()) errors.push(t('offers.offerTitleRequired'));
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateProductsTab = () => {
    const errors: string[] = [];

    if (offerItems.length === 0) {
      errors.push(t('offers.atLeastOneItem'));
    } else {
      // Validate individual items for incomplete selections
      offerItems.forEach((item, index) => {
        if (!item.id || item.id === '' || item.id === 'none') {
          if (item.type === 'product') {
            errors.push(t('offers.productSelectRequired', { index: index + 1 }));
          } else if (item.type === 'service') {
            errors.push(t('offers.serviceSelectRequired', { index: index + 1 }));
          } else if (item.type === 'service_package') {
            errors.push(t('offers.packageSelectRequired', { index: index + 1 }));
          }
        }

        // Validate quantity
        if (item.quantity <= 0) {
          errors.push(t('offers.itemQuantityRequired', { index: index + 1 }));
        }

        // Validate unit price
        if (item.unitPrice < 0) {
          errors.push(t('offers.itemUnitPriceNegative', { index: index + 1 }));
        }
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const validateCurrentTab = () => {
    switch (currentTab) {
      case 'details':
        return validateDetailsTab();
      case 'products':
        return validateProductsTab();
      case 'documents':
        return true; // Documents tab doesn't require validation
      case 'terms':
        return true;
      default:
        return true;
    }
  };

  // Helper function to check if a specific tab has validation errors
  const hasTabErrors = (tabName: string) => {
    switch (tabName) {
      case 'details':
        const detailsErrors: string[] = [];
        if (!offerData.clientId) detailsErrors.push(t('offers.clientRequired'));
        if (!offerData.title.trim()) detailsErrors.push(t('offers.offerTitleRequired'));
        return detailsErrors.length > 0;
      case 'products':
        const productsErrors: string[] = [];
        if (offerItems.length === 0) {
          productsErrors.push(t('offers.atLeastOneItem'));
        } else {
          offerItems.forEach((item, index) => {
            if (!item.id || item.id === '' || item.id === 'none') {
              if (item.type === 'product') {
                productsErrors.push(t('offers.productSelectRequired', { index: index + 1 }));
              } else if (item.type === 'service') {
                productsErrors.push(t('offers.serviceSelectRequired', { index: index + 1 }));
              } else if (item.type === 'service_package') {
                productsErrors.push(t('offers.packageSelectRequired', { index: index + 1 }));
              }
            }
            if (item.quantity <= 0) {
              productsErrors.push(t('offers.itemQuantityRequired', { index: index + 1 }));
            }
            if (item.unitPrice < 0) {
              productsErrors.push(t('offers.itemUnitPriceNegative', { index: index + 1 }));
            }
          });
        }
        return productsErrors.length > 0;
      default:
        return false;
    }
  };

  const handleNextTab = () => {
    if (!validateCurrentTab()) return;

    if (currentTab === 'details') {
      setCurrentTab('products');
    } else if (currentTab === 'products') {
      setCurrentTab('documents');
    } else if (currentTab === 'documents') {
      setCurrentTab('terms');
    }
  };

  const handlePreviousTab = () => {
    if (currentTab === 'terms') {
      setCurrentTab('documents');
    } else if (currentTab === 'documents') {
      setCurrentTab('products');
    } else if (currentTab === 'products') {
      setCurrentTab('details');
    }
  };

  const resetForm = () => {
    setOfferData({
      client: '',
      clientId: '',
      title: '',
      offerDate: new Date().toISOString().split('T')[0],
      currency: 'usd',
      offerStatus: 'draft',
      paymentTerms: 'Payment within 30 days from invoice date.',
      deliveryTerms: 'Delivery within 5-7 business days after order confirmation.',
      validityPeriod: 'This offer is valid for 30 days from the date above.',
      notes: '',
    });
    setOfferItems([]);
    setValidationErrors([]);
    setCurrentTab('details');
    setIsEditMode(false);
    setSelectedOfferForView(null);
    setShowEmailModalAfterSave(false);
    setSavedOfferForEmail(null);
    setClientSearchQuery(''); // Reset client search
    setIsClientDropdownOpen(false); // Close client dropdown
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      setAvailableClients(data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?status=active');
      const data = await response.json();
      setAvailableProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/service-packages?status=active');
      const data = await response.json();
      setAvailablePackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services?status=active');
      const data = await response.json();
      setAvailableServices(data.services || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const handleCreateOffer = async (shouldShowEmailModal = false) => {
    // Validate details tab first
    if (!validateDetailsTab()) {
      setCurrentTab('details');
      // Show a brief message to guide the user
      setTimeout(() => {
        const errorElement = document.querySelector('.text-red-600');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Validate products tab second
    if (!validateProductsTab()) {
      setCurrentTab('products');
      // Show a brief message to guide the user
      setTimeout(() => {
        const errorElement = document.querySelector('.text-red-600');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    try {
      setIsCreatingOffer(true);

      const transformedItems = offerItems.map(item => ({
        type: item.type === 'service_package' ? 'package' : item.type,
        itemId: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0
      }));

      const payload = {
        ...offerData,
        offerStatus: 'draft',
        validUntil: null,
        items: transformedItems,
        subtotal: calculateSubtotal(),
        discount: calculateTotalDiscount(),
        totalAmount: calculateTotal(),
      };

      const createdOffer = await dispatchCreateOffer(payload);
      setIsCreateDialogOpen(false);
      resetForm();

      if (shouldShowEmailModal && createdOffer) {
        setSavedOfferForEmail(createdOffer as Offer);
        setShowEmailModalAfterSave(true);
      } else {
        alert('Offer created successfully!');
      }
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to create offer']);
      alert(`Error creating offer: ${err.message || 'Failed to create offer'}`);
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleUpdateOffer = async (shouldShowEmailModal = false) => {
    // Validate details tab first
    if (!validateDetailsTab()) {
      setCurrentTab('details');
      // Show a brief message to guide the user
      setTimeout(() => {
        const errorElement = document.querySelector('.text-red-600');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Validate products tab second
    if (!validateProductsTab()) {
      setCurrentTab('products');
      // Show a brief message to guide the user
      setTimeout(() => {
        const errorElement = document.querySelector('.text-red-600');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    if (!selectedOfferForView) return;

    try {
      setIsCreatingOffer(true);

      const transformedItems = offerItems.map(item => ({
        type: item.type === 'service_package' ? 'package' : item.type,
        itemId: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0
      }));

      const payload = {
        ...offerData,
        validUntil: null,
        items: transformedItems,
        subtotal: calculateSubtotal(),
        discount: calculateTotalDiscount(),
        totalAmount: calculateTotal(),
      };

      const updatedOffer = await dispatchUpdateOffer(selectedOfferForView.id, payload);
      setIsCreateDialogOpen(false);
      resetForm();

      if (shouldShowEmailModal && updatedOffer) {
        setSavedOfferForEmail(updatedOffer as Offer);
        setShowEmailModalAfterSave(true);
      } else {
        alert('Offer updated successfully!');
      }
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to update offer']);
      alert(`Error updating offer: ${err.message || 'Failed to update offer'}`);
    } finally {
      setIsCreatingOffer(false);
    }
  };

  const handleViewOffer = (offer: Offer) => {
    setSelectedOfferForView(offer);
    setIsViewDialogOpen(true);
  };

  const handleDownloadOffer = async (offer: Offer) => {
    try {
      const response = await fetch(`/api/offers/${offer.id}/download`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${offer.offerNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Error downloading offer');
        alert('Error downloading offer. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading offer:', error);
      alert('Error downloading offer. Please try again.');
    }
  };

  /** Send PDF to client email via configured SMTP (Company settings). */
  const handleEmailOffer = async (offer: Offer) => {
    setIsSharing(offer.id);
    try {
      const response = await fetch(`/api/offers/${offer.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      await dispatchFetchOffers({ status: statusFilter });
      alert(t('offers.emailSentSuccess'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send email';
      alert(msg);
    } finally {
      setIsSharing(null);
    }
  };

  /** Upload PDF and get shareable link (Web Share / manual paste). */
  const handleShareOfferLink = async (offer: Offer) => {
    try {
      setIsSharing(offer.id);

      const response = await fetch(`/api/offers/${offer.id}/share`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate shareable PDF');
      }

      const result = await response.json();

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Offer ${offer.offerNumber}`,
            text: `Please find the offer document at the link below:\n\n${result.url}`,
            url: result.url
          });
          return;
        } catch {
          console.log('Web Share API failed, falling back to other methods');
        }
      }

      showEmailOptions(offer, result.url);
    } catch (error) {
      console.error('Error sharing offer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error sharing offer: ${errorMessage}. Please try downloading the PDF manually.`);
      try {
        await handleDownloadOffer(offer);
      } catch (downloadError) {
        console.error('Download also failed:', downloadError);
      }
    } finally {
      setIsSharing(null);
    }
  };

  const handleGmailShare = async (offer: Offer) => {
    try {
      // Set loading state
      setIsSharing(offer.id);

      // Upload PDF to cloud and get URL
      const response = await fetch(`/api/offers/${offer.id}/share`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate shareable PDF');
      }

      const result = await response.json();

      // Open Gmail with download link
      const subject = encodeURIComponent(`Offer ${offer.offerNumber} - ${offer.title}`);
      const body = encodeURIComponent(`Dear Client,

Please find the offer document at the secure link below:

📄 Download Offer PDF: ${result.url}

Offer Details:
• Offer Number: ${offer.offerNumber}
• Project: ${offer.title}
• Date: ${new Date(offer.offerDate).toLocaleDateString()}
• Total Amount: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${offer.totalAmount?.toFixed(2)}

The PDF document is securely hosted and can be downloaded directly from the link above.

Best regards,
${companyTitle} Team`);

      // Open Gmail
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');

      // Show success message
      setTimeout(() => {
        alert(`📧 Gmail opened with download link!

✅ Ready to send:
• Professional email template
• Secure download link included
• Complete offer details

Just add the recipient's email address and send!`);
      }, 1000);

    } catch (error) {
      console.error('Error sharing via Gmail:', error);
      alert('Error generating shareable link. Please try again.');
    } finally {
      // Clear loading state
      setIsSharing(null);
    }
  };

  const handleOutlookShare = async (offer: Offer) => {
    try {
      // Set loading state
      setIsSharing(offer.id);

      // Upload PDF to cloud and get URL
      const response = await fetch(`/api/offers/${offer.id}/share`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate shareable PDF');
      }

      const result = await response.json();

      // Open Outlook with download link
      const subject = encodeURIComponent(`Offer ${offer.offerNumber} - ${offer.title}`);
      const body = encodeURIComponent(`Dear Client,

Please find the offer document at the secure link below:

📄 Download Offer PDF: ${result.url}

Offer Details:
• Offer Number: ${offer.offerNumber}
• Project: ${offer.title}
• Date: ${new Date(offer.offerDate).toLocaleDateString()}
• Total Amount: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${offer.totalAmount?.toFixed(2)}

The PDF document is securely hosted and can be downloaded directly from the link above.

Best regards,
${companyTitle} Team`);

      // Open Outlook
      window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`, '_blank');

      // Show success message
      setTimeout(() => {
        alert(`📧 Outlook opened with download link!

✅ Ready to send:
• Professional email template
• Secure download link included
• Complete offer details

Just add the recipient's email address and send!`);
      }, 1000);

    } catch (error) {
      console.error('Error sharing via Outlook:', error);
      alert('Error generating shareable link. Please try again.');
    } finally {
      // Clear loading state
      setIsSharing(null);
    }
  };

  const handleEmailClientFallback = async (offer: Offer) => {
    const subject = encodeURIComponent(`Offer ${offer.offerNumber} - ${offer.title}`);
    const body = encodeURIComponent(`Dear Client,

Please find below the details of our offer. The PDF document can be downloaded separately.

Offer Details:
- Offer Number: ${offer.offerNumber}
- Project: ${offer.title}
- Date: ${new Date(offer.offerDate).toLocaleDateString()}
- Total Amount: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${offer.totalAmount?.toFixed(2)}

Items:
${offer.items?.map((item: any, index: number) =>
      `${index + 1}. ${item.name} - Qty: ${item.quantity} - ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${item.total?.toFixed(2)}`
    ).join('\n') || 'No items'}

${offer.paymentTerms ? `Payment Terms: ${offer.paymentTerms}` : ''}
${offer.deliveryTerms ? `Delivery Terms: ${offer.deliveryTerms}` : ''}
${offer.notes ? `Additional Notes: ${offer.notes}` : ''}

To download the PDF version, please visit our system or contact us directly.

Best regards,
Your Company Team`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const showEmailOptions = (offer: Offer, pdfUrl?: string) => {
    if (pdfUrl) {
      // Cloud-based sharing with URL
      const message = `📧 Email Sharing Options for ${offer.offerNumber}

✅ PDF uploaded to secure cloud storage!

Choose your preferred method:

1️⃣ SEND DOWNLOAD LINK (Recommended)
   • Professional email with secure download link
   • Recipients can download PDF directly
   • No file size limitations

2️⃣ COPY DOWNLOAD LINK
   • Copy the secure link to clipboard
   • Paste into any email or messaging app

3️⃣ COPY OFFER DETAILS + LINK
   • Complete offer information with download link

Click OK for Option 1 (Send Link), Cancel for Option 2 (Copy Link)`;

      const sendEmail = confirm(message);

      if (sendEmail) {
        // Option 1: Open email with download link
        const subject = encodeURIComponent(`Offer ${offer.offerNumber} - ${offer.title}`);
        const body = encodeURIComponent(`Dear Client,

Please find the offer document at the secure link below:

📄 Download Offer PDF: ${pdfUrl}

Offer Details:
• Offer Number: ${offer.offerNumber}
• Project: ${offer.title}
• Date: ${new Date(offer.offerDate).toLocaleDateString()}
• Total Amount: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${offer.totalAmount?.toFixed(2)}

The PDF document is securely hosted and can be downloaded directly from the link above.

Best regards,
${companyTitle} Team`);

        // Try to open default email client
        window.location.href = `mailto:?subject=${subject}&body=${body}`;

        // Show success message
        setTimeout(() => {
          alert(`✅ Email opened with download link!

📎 The email contains:
• Professional message
• Secure download link: ${pdfUrl}
• Complete offer details

Just add the recipient's email address and send!`);
        }, 500);
      } else {
        // Option 2: Copy link to clipboard
        navigator.clipboard.writeText(pdfUrl).then(() => {
          alert(`✅ Download link copied to clipboard!

🔗 Link: ${pdfUrl}

You can now:
• Paste into any email client
• Share via WhatsApp, Telegram, etc.
• Add to documents or messages

💡 The link is secure and allows direct PDF download.`);
        }).catch(() => {
          prompt('Copy this download link:', pdfUrl);
        });
      }
    } else {
      // Fallback to old method if no URL provided
      const fileName = `${offer.offerNumber || 'offer'}.pdf`;

      const message = `📧 Email Sharing Options for ${offer.offerNumber}

⚠️ Important: Web browsers cannot directly attach files to emails for security reasons.

Choose your preferred method:

1️⃣ DOWNLOAD + MANUAL ATTACH (Recommended)
   • Downloads PDF to your device
   • You manually attach it to your email

2️⃣ COPY OFFER DETAILS
   • Copies offer information to clipboard
   • Paste into any email or messaging app

Click OK for Option 1 (Download + Manual), Cancel for Option 2 (Copy Details)`;

      const useDownload = confirm(message);

      if (useDownload) {
        handleDownloadOffer(offer);
        setTimeout(() => {
          alert(`✅ PDF Downloaded Successfully!

📎 Next Steps:
1. Check your Downloads folder for "${fileName}"
2. Open your email client (Gmail, Outlook, etc.)
3. Compose a new email
4. Click "Attach" or "📎" button
5. Select the downloaded PDF file
6. Send your email

💡 Tip: You can also drag & drop the PDF file into your email compose window.`);
        }, 500);
      } else {
        copyOfferToClipboard(offer);
      }
    }
  };

  const copyOfferToClipboard = async (offer: Offer) => {
    const offerText = `📄 OFFER DETAILS

Offer Number: ${offer.offerNumber}
Project: ${offer.title}
Client: ${offer.client}
Date: ${new Date(offer.offerDate).toLocaleDateString()}
Total Amount: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${offer.totalAmount?.toFixed(2)}

📋 ITEMS:
${offer.items?.map((item: any, index: number) =>
      `${index + 1}. ${item.name}
   Quantity: ${item.quantity}
   Unit Price: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${item.unitPrice?.toFixed(2) || '0.00'}
   Total: ${offer.currency === 'eur' ? '€' : offer.currency === 'usd' ? '$' : 'Lek '}${item.total?.toFixed(2) || '0.00'}`
    ).join('\n\n') || 'No items'}

💼 TERMS:
${offer.paymentTerms ? `Payment: ${offer.paymentTerms}` : ''}
${offer.deliveryTerms ? `Delivery: ${offer.deliveryTerms}` : ''}
${offer.notes ? `Notes: ${offer.notes}` : ''}

---
Generated from ${companyTitle} CRM System (${companyTagline})`;

    try {
      await navigator.clipboard.writeText(offerText);
      alert(`✅ Offer details copied to clipboard!

You can now:
• Paste into any email client
• Share via WhatsApp, Telegram, etc.
• Add to documents or notes

💡 Tip: The PDF file can be downloaded separately using the Download button.`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show text in a dialog for manual copying
      const textArea = document.createElement('textarea');
      textArea.value = offerText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      alert(`📋 Offer details copied to clipboard!

If automatic copy failed, here's the text to copy manually:

${offerText.substring(0, 200)}...

(Full text has been selected for manual copy)`);
    }
  };

  const handleDropdownToggle = (offerId: string, event: React.MouseEvent, type: 'email' | 'actions') => {
    event.preventDefault();
    event.stopPropagation();

    if (openDropdownId === offerId && dropdownType === type) {
      setOpenDropdownId(null);
      setDropdownPosition(null);
      setDropdownType(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = type === 'email' ? 160 : 200; // Different heights for different dropdowns
      const dropdownWidth = 160; // Width of dropdown
      const padding = 8; // Minimum padding from viewport edges

      // Check if dropdown should open upward
      const spaceBelow = viewportHeight - rect.bottom - padding;
      const spaceAbove = rect.top - padding;
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove >= dropdownHeight;

      // Calculate vertical position
      let top;
      if (shouldOpenUpward) {
        top = rect.top - dropdownHeight;
      } else {
        top = rect.bottom;
      }

      // Ensure dropdown doesn't go off-screen vertically
      if (top < padding) {
        top = padding;
      } else if (top + dropdownHeight > viewportHeight - padding) {
        top = viewportHeight - dropdownHeight - padding;
      }

      // Calculate horizontal position (prefer right-aligned)
      let right = viewportWidth - rect.right;

      // Ensure dropdown doesn't go off-screen horizontally
      if (right < padding) {
        // Not enough space on the right, try left-aligned
        right = viewportWidth - rect.left - dropdownWidth;
        if (right < padding) {
          // Still not enough space, center it with minimum padding
          right = padding;
        }
      }

      setDropdownPosition({
        top,
        right: Math.max(padding, right),
        openUpward: shouldOpenUpward
      });
      setOpenDropdownId(offerId);
      setDropdownType(type);
    }
  };

  const closeDropdown = () => {
    setOpenDropdownId(null);
    setDropdownPosition(null);
    setDropdownType(null);
  };

  const handleDeleteOffer = (offer: Offer) => {
    setSelectedOfferForDelete(offer);
    setIsDeleteConfirmOpen(true);
  };

  const handleEditOffer = (offer: Offer) => {
    setIsEditMode(true);
    setSelectedOfferForView(offer);

    // Populate form with existing offer data
    setOfferData({
      client: offer.client,
      clientId: offer.clientId || '',
      title: offer.title,
      offerDate: offer.offerDate.split('T')[0],
      currency: offer.currency,
      offerStatus: offer.offerStatus,
      paymentTerms: offer.paymentTerms || 'Payment within 30 days from invoice date.',
      deliveryTerms: offer.deliveryTerms || 'Delivery within 5-7 business days after order confirmation.',
      validityPeriod: offer.validityPeriod || 'This offer is valid for 30 days from the date above.',
      notes: offer.notes || '',
    });

    // Convert offer items to the format expected by the form
    const formattedItems: OfferItem[] = (offer.items || []).map((item: any) => ({
      type: item.type === 'package' ? 'service_package' : item.type, // Convert package back to service_package
      id: item.itemId || item.id,
      name: item.name || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
      total: item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)),
      packageItems: item.packageItems || [],
      fromPackage: item.fromPackage || '',
      packageId: item.packageId || '',
    }));

    setOfferItems(formattedItems);
    setCurrentTab('details');
    setValidationErrors([]);
    setClientSearchQuery(''); // Reset client search
    setIsClientDropdownOpen(false); // Close client dropdown
    setIsCreateDialogOpen(true);

    // Show warning about potential inactive items
    if (formattedItems.length > 0) {
      console.log('Note: When editing existing offers, please verify that all items are still active before saving.');
    }
  };

  const confirmDeleteOffer = async () => {
    if (!selectedOfferForDelete) return;
    try {
      await dispatchDeleteOffer(selectedOfferForDelete.id);
      setIsDeleteConfirmOpen(false);
      setSelectedOfferForDelete(null);
      alert('Offer deleted successfully!');
    } catch (err: any) {
      alert(`Error deleting offer: ${err.message || 'Failed to delete offer'}`);
    }
  };

  const handleUpdateOfferStatus = async (offerId: string, newStatus: string) => {
    const fieldKey = `${offerId}-status`;
    setIsUpdatingField(fieldKey);
    try {
      const offer = offers.find(o => o.id === offerId);
      if (!offer) return;
      await dispatchUpdateOffer(offerId, { ...offer, offerStatus: newStatus });
    } catch (error) {
      alert('Failed to update offer status');
    } finally {
      setIsUpdatingField(null);
    }
  };

  const calculateSubtotal = () => {
    return offerItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const calculateTotalDiscount = () => {
    return offerItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discount / 100)), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateTotalDiscount();
    return subtotal - discount;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const currencyToUse = currency || offerData.currency;
    const symbol = getCurrencySymbol(currencyToUse);

    // For Albanian Lek, show without decimals if it's a whole number
    if (currencyToUse === 'all') {
      return `${symbol}${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}`;
    }

    return `${symbol}${amount.toFixed(2)}`;
  };

  const addProductToOffer = () => {
    setOfferItems([...offerItems, {
      type: 'product',
      id: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    }]);
  };

  const addServicePackageToOffer = () => {
    setOfferItems([...offerItems, {
      type: 'service_package',
      id: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    }]);
  };

  const addServiceToOffer = () => {
    setOfferItems([...offerItems, {
      type: 'service',
      id: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    }]);
  };

  const removeItemFromOffer = (index: number) => {
    setOfferItems(offerItems.filter((_, i) => i !== index));
  };

  const updateOfferItem = (index: number, field: string, value: any) => {
    const updatedItems = [...offerItems];
    (updatedItems[index] as any)[field] = value;

    // Recalculate total when quantity, unitPrice, or discount changes
    if (['quantity', 'unitPrice', 'discount'].includes(field)) {
      const item = updatedItems[index];
      item.total = item.quantity * item.unitPrice * (1 - item.discount / 100);
    }

    setOfferItems(updatedItems);
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setOfferData({ ...offerData, currency: newCurrency });

    // Force recalculation of all item totals to ensure proper display
    const updatedItems = offerItems.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice * (1 - item.discount / 100)
    }));

    setOfferItems(updatedItems);
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.offerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.title.toLowerCase().includes(searchQuery.toLowerCase());
    const eff = displayOfferStatus(offer);
    const matchesStatus = statusFilter === 'all' || eff === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{t('offers.draft')}</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('offers.accepted')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t('offers.rejected')}</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t('offers.sent')}</Badge>;
      case 'expired':
        return <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">{t('offers.expired')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('offers.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('offers.allStatus')}</SelectItem>
              <SelectItem value="draft">{t('offers.draft')}</SelectItem>
              <SelectItem value="sent">{t('offers.sent')}</SelectItem>
              <SelectItem value="expired">{t('offers.expired')}</SelectItem>
              <SelectItem value="accepted">{t('offers.accepted')}</SelectItem>
              <SelectItem value="rejected">{t('offers.rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('offers.exportReport')}
          </Button>

          {canEdit && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-medium shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('offers.createOffer')}
            </Button>
          )}
        </div>
      </div>

      {/* Create/Edit Offer Modal */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full max-w-none flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4 flex-shrink-0 bg-white flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  {isEditMode ? t('offers.editOffer') : t('offers.createNewOffer')}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('offers.offerSubtitle')}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4 pb-24">
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full max-w-7xl mx-auto">
                <TabsList className="grid w-full grid-cols-4 mb-6 bg-white border">
                  <TabsTrigger
                    value="details"
                    className={`text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 ${hasTabErrors('details') ? 'text-red-600 border-red-200' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      1. {t('offers.tabDetails')}
                      {hasTabErrors('details') && <AlertTriangle className="inline w-4 h-4 text-red-500" aria-hidden />}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="products"
                    className={`text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 ${hasTabErrors('products') ? 'text-red-600 border-red-200' : ''}`}
                    disabled={!offerData.clientId || !offerData.title.trim()}
                  >
                    <div className="flex items-center gap-2">
                      2. {t('offers.tabProducts')}
                      {hasTabErrors('products') && <AlertTriangle className="inline w-4 h-4 text-red-500" aria-hidden />}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
                    disabled={offerItems.length === 0}
                  >
                    3. {t('offers.tabDocuments')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="terms"
                    className="text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600"
                    disabled={offerItems.length === 0}
                  >
                    4. {t('offers.tabTerms')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 mt-0">
                  <Card className="p-6 bg-white">
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-2">
                          <Label className="text-sm font-medium">{t('offers.client')} <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <Input
                              placeholder={t('offers.searchSelectClient')}
                              value={clientSearchQuery || offerData.client}
                              onChange={(e) => {
                                setClientSearchQuery(e.target.value);
                                setIsClientDropdownOpen(true);
                                // Clear selection if user is typing
                                if (e.target.value !== offerData.client) {
                                  setOfferData({
                                    ...offerData,
                                    clientId: '',
                                    client: ''
                                  });
                                }
                              }}
                              onFocus={() => setIsClientDropdownOpen(true)}
                              className={!offerData.clientId && validationErrors.some(e => e === t('offers.clientRequired')) ? 'border-red-500' : ''}
                            />

                            {/* Searchable Dropdown */}
                            {isClientDropdownOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setIsClientDropdownOpen(false)}
                                />
                                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                  {availableClients
                                    .filter(client =>
                                      client.fullName.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      (client.phone && client.phone.includes(clientSearchQuery))
                                    )
                                    .map((client) => (
                                      <div
                                        key={client.id}
                                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => {
                                          setOfferData({
                                            ...offerData,
                                            clientId: client.id,
                                            client: client.fullName
                                          });
                                          setClientSearchQuery('');
                                          setIsClientDropdownOpen(false);
                                          setValidationErrors([]);
                                        }}
                                      >
                                        <div className="font-medium text-gray-900">{client.fullName}</div>
                                        <div className="text-sm text-gray-500">{client.email}</div>
                                        {client.phone && (
                                          <div className="text-sm text-gray-500">{client.phone}</div>
                                        )}
                                      </div>
                                    ))
                                  }
                                  {availableClients
                                    .filter(client =>
                                      client.fullName.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                                      (client.phone && client.phone.includes(clientSearchQuery))
                                    ).length === 0 && clientSearchQuery && (
                                      <div className="px-4 py-3 text-gray-500 text-center">
                                        No clients found matching "{clientSearchQuery}"
                                      </div>
                                    )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">{t('offers.offerNumber')}</Label>
                          <Input placeholder={t('offers.autoGenerated')} disabled className="bg-gray-50" />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">{t('offers.date')}</Label>
                          <Input
                            type="date"
                            value={offerData.offerDate}
                            onChange={(e) => setOfferData({ ...offerData, offerDate: e.target.value })}
                          />
                        </div>

                        <div className="col-span-2 space-y-2">
                          <Label className="text-sm font-medium">{t('offers.offerTitle')} <span className="text-red-500">*</span></Label>
                          <Input
                            placeholder={t('offers.enterOfferTitle')}
                            value={offerData.title}
                            onChange={(e) => {
                              setOfferData({ ...offerData, title: e.target.value });
                              setValidationErrors([]);
                            }}
                            className={!offerData.title.trim() && validationErrors.some(e => e === t('offers.offerTitleRequired')) ? 'border-red-500' : ''}
                          />
                        </div>

                        {!isEditMode ? (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('offers.status')}</Label>
                            <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                              {t('offers.draft')}
                            </div>
                            <p className="text-xs text-gray-500">{t('offers.statusCreateHint')}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('offers.status')}</Label>
                            <Select
                              value={offerData.offerStatus}
                              onValueChange={(value) => setOfferData({ ...offerData, offerStatus: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">{t('offers.draft')}</SelectItem>
                                <SelectItem value="sent">{t('offers.sent')}</SelectItem>
                                <SelectItem value="accepted">{t('offers.accepted')}</SelectItem>
                                <SelectItem value="rejected">{t('offers.rejected')}</SelectItem>
                                <SelectItem value="expired">{t('offers.expired')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" aria-hidden />
                            <div>
                              <h4 className="text-sm font-medium text-red-800 mb-1">{t('offers.fixErrors')}</h4>
                              <ul className="text-sm text-red-700 space-y-1">
                                {validationErrors.map((error, index) => (
                                  <li key={index}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="products" className="space-y-4 mt-0">
                  <Card className="p-6 bg-white">
                    {/* Currency Selection */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium text-blue-800">{t('offers.currency')}</Label>
                          <p className="text-xs text-blue-600 mt-1">{t('offers.selectCurrency')}</p>
                        </div>
                        <Select value={offerData.currency} onValueChange={handleCurrencyChange}>
                          <SelectTrigger className="w-40 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eur">{t('offers.currencyEur')}</SelectItem>
                            <SelectItem value="all">{t('offers.currencyAll')}</SelectItem>
                            <SelectItem value="usd">{t('offers.currencyUsd')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                      <Button
                        variant="outline"
                        onClick={addProductToOffer}
                        className="flex-1 h-11 text-sm font-medium border-blue-200 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('offers.addProduct')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={addServiceToOffer}
                        className="flex-1 h-11 text-sm font-medium border-purple-200 hover:bg-purple-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('offers.addService')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={addServicePackageToOffer}
                        className="flex-1 h-11 text-sm font-medium border-green-200 hover:bg-green-50"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        {t('offers.addServicePackage')}
                      </Button>
                    </div>

                    {offerItems.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed rounded-lg bg-gray-50">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium text-lg">{t('offers.noItemsAdded')}</p>
                        <p className="text-sm text-gray-400 mt-2">{t('offers.addItemsHint')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {offerItems.map((item, index) => (
                          <Card key={index} className="p-4 border-2 hover:border-blue-400 transition-all">
                            <div className="flex items-center justify-between mb-4">
                              <Badge variant={item.type === 'product' ? 'default' : item.type === 'service' ? 'outline' : 'secondary'}>
                                {item.type === 'product' ? `📦 ${t('offers.product')}` : item.type === 'service' ? `🔧 ${t('offers.service')}` : `🎁 ${t('offers.servicePackage')}`}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromOffer(index)}
                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-5 gap-4">
                              <div className="col-span-2">
                                <Label className="text-sm font-medium">
                                  {item.type === 'product' ? t('offers.product') : item.type === 'service' ? t('offers.service') : t('offers.servicePackage')}
                                </Label>
                                <Select
                                  value={item.id}
                                  onValueChange={(value) => {
                                    let source, selected;
                                    if (item.type === 'product') {
                                      source = availableProducts;
                                      selected = source.find(p => p.id === value);
                                      if (selected) {
                                        updateOfferItem(index, 'id', value);
                                        updateOfferItem(index, 'name', selected.title);
                                        updateOfferItem(index, 'unitPrice', selected.price || 0);
                                        // Clear validation errors when a valid selection is made
                                        setValidationErrors([]);
                                      }
                                    } else if (item.type === 'service') {
                                      source = availableServices;
                                      selected = source.find(s => s.id === value);
                                      if (selected) {
                                        updateOfferItem(index, 'id', value);
                                        updateOfferItem(index, 'name', selected.title);
                                        updateOfferItem(index, 'unitPrice', selected.price || 0);
                                        // Clear validation errors when a valid selection is made
                                        setValidationErrors([]);
                                      }
                                    } else {
                                      source = availablePackages;
                                      selected = source.find(p => p.id === value);
                                      if (selected) {
                                        updateOfferItem(index, 'id', value);
                                        updateOfferItem(index, 'name', selected.name);
                                        updateOfferItem(index, 'unitPrice', selected.price || 0);
                                        // Clear validation errors when a valid selection is made
                                        setValidationErrors([]);
                                      }
                                    }
                                  }}
                                >
                                  <SelectTrigger className={`min-h-[2.5rem] h-auto whitespace-normal [&_*[data-slot=select-value]]:line-clamp-none [&_*[data-slot=select-value]]:whitespace-normal ${(!item.id || item.id === '' || item.id === 'none') && validationErrors.some(e => e.includes(`#${index + 1}`)) ? 'border-red-500' : ''}`}>
                                    <SelectValue
                                      placeholder={item.type === 'product' ? t('offers.selectProduct') : item.type === 'service' ? t('offers.selectService') : t('offers.selectPackage')}
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(() => {
                                      let source;
                                      if (item.type === 'product') {
                                        source = availableProducts;
                                      } else if (item.type === 'service') {
                                        source = availableServices;
                                      } else {
                                        source = availablePackages;
                                      }

                                      return source.map((option: any) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {item.type === 'product' || item.type === 'service' ? option.title : option.name} - {formatCurrency(option.price || 0)}
                                        </SelectItem>
                                      ));
                                    })()}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label className="text-sm font-medium">{t('offers.quantity')}</Label>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newQuantity = parseFloat(e.target.value) || 1;
                                    updateOfferItem(index, 'quantity', newQuantity);
                                    // Clear validation errors when quantity becomes valid
                                    if (newQuantity > 0) {
                                      setValidationErrors([]);
                                    }
                                  }}
                                  min="1"
                                  className={item.quantity <= 0 && validationErrors.some(e => e === t('offers.itemQuantityRequired', { index: index + 1 })) ? 'border-red-500' : ''}
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">{t('offers.unitPrice')} ({getCurrencySymbol(offerData.currency)})</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    updateOfferItem(index, 'unitPrice', newPrice);
                                    // Clear validation errors when price becomes valid
                                    if (newPrice >= 0) {
                                      setValidationErrors([]);
                                    }
                                  }}
                                  min="0"
                                  className={item.unitPrice < 0 && validationErrors.some(e => e === t('offers.itemUnitPriceNegative', { index: index + 1 })) ? 'border-red-500' : ''}
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">{t('offers.total')}</Label>
                                <div className="h-10 flex items-center justify-end bg-gray-50 border rounded-md px-3">
                                  <span className="font-bold text-gray-900">{formatCurrency(item.total)}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}

                        {/* Summary */}
                        <div className="border-t pt-4 space-y-2 bg-blue-50 p-4 rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span>{t('offers.subtotal')}:</span>
                            <span>{formatCurrency(calculateSubtotal())}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t pt-2">
                            <span>{t('offers.total')}:</span>
                            <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" aria-hidden />
                          <div>
                            <h4 className="text-sm font-medium text-red-800 mb-1">{t('offers.fixErrors')}</h4>
                            <ul className="text-sm text-red-700 space-y-1">
                              {validationErrors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4 mt-0">
                  <Card className="p-6 bg-white">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{t('offers.technicalDocuments')}</h3>
                          <p className="text-sm text-gray-500">{t('offers.documentsFromItems')}</p>
                        </div>
                      </div>

                      {offerItems.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg bg-gray-50">
                          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 font-medium text-lg">{t('offers.noItemsSelected')}</p>
                          <p className="text-sm text-gray-400 mt-2">{t('offers.addItemsForDocuments')}</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Product Documents */}
                          {offerItems.filter(item => item.type === 'product' && item.id).length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 pb-2 border-b">
                                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                  <span className="text-xs font-bold text-blue-600">📦</span>
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">{t('offers.productDocuments')}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {t('offers.productsCount', { count: offerItems.filter(item => item.type === 'product' && item.id).length })}
                                </Badge>
                              </div>

                              <div className="grid gap-4">
                                {offerItems
                                  .filter(item => item.type === 'product' && item.id)
                                  .map((item, index) => {
                                    const product = availableProducts.find(p => p.id === item.id);
                                    const documents = getDocumentFiles(product?.documents);

                                    return (
                                      <Card key={`product-${index}`} className="p-4 border-l-4 border-l-blue-500 bg-blue-50/30">
                                        <div className="space-y-3">
                                          <div className="flex items-start justify-between">
                                            <div>
                                              <h5 className="font-medium text-gray-900">{item.name}</h5>
                                              <p className="text-sm text-gray-600">{t('offers.quantityLabel')}: {item.quantity}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                              {t('offers.documentsCount', { count: documents.length })}
                                            </Badge>
                                          </div>

                                          {documents.length > 0 ? (
                                            <div className="space-y-2">
                                              {documents.map((doc: any, docIndex: number) => (
                                                <div key={docIndex} className="flex items-center gap-3 p-2 bg-white rounded border">
                                                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-blue-600">📄</span>
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                      {doc.title || doc.fileName || doc.name || t('offers.documentDefault', { index: docIndex + 1 })}
                                                    </p>
                                                    {doc.description && (
                                                      <p className="text-xs text-gray-500 truncate">{doc.description}</p>
                                                    )}
                                                  </div>
                                                  {(doc.fileUrl || doc.url) && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => window.open(doc.fileUrl || doc.url, '_blank')}
                                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                      <Eye className="w-4 h-4" />
                                                    </Button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-4 text-gray-500 text-sm bg-white rounded border-2 border-dashed">
                                              {t('offers.noDocumentsForProduct')}
                                            </div>
                                          )}
                                        </div>
                                      </Card>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Service Documents */}
                          {offerItems.filter(item => item.type === 'service' && item.id).length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 pb-2 border-b">
                                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                                  <span className="text-xs font-bold text-purple-600">🔧</span>
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">{t('offers.serviceDocuments')}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {t('offers.servicesCount', { count: offerItems.filter(item => item.type === 'service' && item.id).length })}
                                </Badge>
                              </div>

                              <div className="grid gap-4">
                                {offerItems
                                  .filter(item => item.type === 'service' && item.id)
                                  .map((item, index) => {
                                    const service = availableServices.find(s => s.id === item.id);
                                    const documents = getDocumentFiles(service?.documents);

                                    return (
                                      <Card key={`service-${index}`} className="p-4 border-l-4 border-l-purple-500 bg-purple-50/30">
                                        <div className="space-y-3">
                                          <div className="flex items-start justify-between">
                                            <div>
                                              <h5 className="font-medium text-gray-900">{item.name}</h5>
                                              <p className="text-sm text-gray-600">{t('offers.quantityLabel')}: {item.quantity}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                              {t('offers.documentsCount', { count: documents.length })}
                                            </Badge>
                                          </div>

                                          {documents.length > 0 ? (
                                            <div className="space-y-2">
                                              {documents.map((doc: any, docIndex: number) => (
                                                <div key={docIndex} className="flex items-center gap-3 p-2 bg-white rounded border">
                                                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                                    <span className="text-xs font-bold text-purple-600">📄</span>
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                      {doc.title || doc.fileName || doc.name || t('offers.documentDefault', { index: docIndex + 1 })}
                                                    </p>
                                                    {doc.description && (
                                                      <p className="text-xs text-gray-500 truncate">{doc.description}</p>
                                                    )}
                                                  </div>
                                                  {(doc.fileUrl || doc.url) && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => window.open(doc.fileUrl || doc.url, '_blank')}
                                                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                    >
                                                      <Eye className="w-4 h-4" />
                                                    </Button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-4 text-gray-500 text-sm bg-white rounded border-2 border-dashed">
                                              {t('offers.noDocumentsForService')}
                                            </div>
                                          )}
                                        </div>
                                      </Card>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Service Package Documents */}
                          {offerItems.filter(item => item.type === 'service_package' && item.id).length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 pb-2 border-b">
                                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                                  <span className="text-xs font-bold text-green-600">🎁</span>
                                </div>
                                <h4 className="text-base font-semibold text-gray-900">{t('offers.servicePackageDocuments')}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {t('offers.packagesCount', { count: offerItems.filter(item => item.type === 'service_package' && item.id).length })}
                                </Badge>
                              </div>

                              <div className="grid gap-4">
                                {offerItems
                                  .filter(item => item.type === 'service_package' && item.id)
                                  .map((item, index) => {
                                    const servicePackage = availablePackages.find(p => p.id === item.id);
                                    const pkgServices = (servicePackage?.services as any[]) || [];
                                    const pkgProducts = (servicePackage?.products as any[]) || [];
                                    const nestedServiceRows = pkgServices
                                      .map((s) => s?.details || availableServices.find((sv) => sv.id === s?.id))
                                      .filter(Boolean);
                                    const nestedProductRows = pkgProducts
                                      .map((p) => p?.details || availableProducts.find((pr) => pr.id === p?.id))
                                      .filter(Boolean);
                                    const packageDocTotal =
                                      nestedServiceRows.reduce(
                                        (n, row: any) => n + countDocumentFiles(row?.documents),
                                        0
                                      ) +
                                      nestedProductRows.reduce(
                                        (n, row: any) => n + countDocumentFiles(row?.documents),
                                        0
                                      );

                                    return (
                                      <Card key={`package-${index}`} className="p-4 border-l-4 border-l-green-500 bg-green-50/30">
                                        <div className="space-y-4">
                                          <div className="flex items-start justify-between">
                                            <div>
                                              <h5 className="font-medium text-gray-900">{item.name}</h5>
                                              <p className="text-sm text-gray-600">{t('offers.quantityLabel')}: {item.quantity}</p>
                                              <p className="text-xs text-gray-500 mt-1">{t('offers.packageDocumentsHint')}</p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                              {t('offers.documentsCount', { count: packageDocTotal })}
                                            </Badge>
                                          </div>

                                          {nestedServiceRows.length > 0 && (
                                            <div className="space-y-2 pl-2 border-l-2 border-green-200">
                                              <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">
                                                {t('offers.servicesInPackage')}
                                              </p>
                                              {(nestedServiceRows as any[]).map((row, si) => {
                                                const docs = getDocumentFiles(row?.documents);
                                                return (
                                                  <div key={`ps-${si}`} className="rounded-md bg-white/80 p-3 border border-green-100">
                                                    <p className="text-sm font-medium text-gray-900">{row.title || row.name}</p>
                                                    {docs.length === 0 ? (
                                                      <p className="text-xs text-gray-500 mt-1">{t('offers.noDocumentsForService')}</p>
                                                    ) : (
                                                      <div className="mt-2 space-y-2">
                                                        {docs.map((doc, di) => (
                                                          <div key={di} className="flex items-center gap-3 p-2 bg-white rounded border">
                                                            <FileText className="w-4 h-4 text-green-600 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                                {doc.title || doc.fileName || doc.name || t('offers.documentDefault', { index: di + 1 })}
                                                              </p>
                                                            </div>
                                                            {(doc.fileUrl || doc.url) && (
                                                              <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => window.open(doc.fileUrl || doc.url, '_blank')}
                                                                className="text-green-600"
                                                              >
                                                                <Eye className="w-4 h-4" />
                                                              </Button>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {nestedProductRows.length > 0 && (
                                            <div className="space-y-2 pl-2 border-l-2 border-emerald-200">
                                              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                                                {t('offers.productsInPackage')}
                                              </p>
                                              {(nestedProductRows as any[]).map((row, pi) => {
                                                const docs = getDocumentFiles(row?.documents);
                                                return (
                                                  <div key={`pp-${pi}`} className="rounded-md bg-white/80 p-3 border border-emerald-100">
                                                    <p className="text-sm font-medium text-gray-900">{row.title || row.name}</p>
                                                    {docs.length === 0 ? (
                                                      <p className="text-xs text-gray-500 mt-1">{t('offers.noDocumentsForProduct')}</p>
                                                    ) : (
                                                      <div className="mt-2 space-y-2">
                                                        {docs.map((doc, di) => (
                                                          <div key={di} className="flex items-center gap-3 p-2 bg-white rounded border">
                                                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                                {doc.title || doc.fileName || doc.name || t('offers.documentDefault', { index: di + 1 })}
                                                              </p>
                                                            </div>
                                                            {(doc.fileUrl || doc.url) && (
                                                              <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => window.open(doc.fileUrl || doc.url, '_blank')}
                                                                className="text-emerald-600"
                                                              >
                                                                <Eye className="w-4 h-4" />
                                                              </Button>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                          {nestedServiceRows.length === 0 && nestedProductRows.length === 0 && (
                                            <div className="text-center py-4 text-gray-500 text-sm bg-white rounded border-2 border-dashed">
                                              {t('offers.noPackageItemsResolved')}
                                            </div>
                                          )}
                                        </div>
                                      </Card>
                                    );
                                  })}
                              </div>
                            </div>
                          )}

                          {/* Summary */}
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{t('offers.documentSummary')}</h4>
                                <p className="text-xs text-gray-600 mt-1">{t('offers.totalDocumentsFromItems')}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                  {offerItems.reduce((total, item) => {
                                    if (item.type === 'product') {
                                      const product = availableProducts.find(p => p.id === item.id);
                                      return total + countDocumentFiles(product?.documents);
                                    }
                                    if (item.type === 'service') {
                                      const service = availableServices.find(s => s.id === item.id);
                                      return total + countDocumentFiles(service?.documents);
                                    }
                                    if (item.type === 'service_package') {
                                      const servicePackage = availablePackages.find(p => p.id === item.id);
                                      const pkgServices = (servicePackage?.services as any[]) || [];
                                      const pkgProducts = (servicePackage?.products as any[]) || [];
                                      const svcRows = pkgServices
                                        .map((s) => s?.details || availableServices.find((sv) => sv.id === s?.id))
                                        .filter(Boolean) as any[];
                                      const prodRows = pkgProducts
                                        .map((p) => p?.details || availableProducts.find((pr) => pr.id === p?.id))
                                        .filter(Boolean) as any[];
                                      const nested =
                                        svcRows.reduce((n, row) => n + countDocumentFiles(row?.documents), 0) +
                                        prodRows.reduce((n, row) => n + countDocumentFiles(row?.documents), 0);
                                      return total + nested;
                                    }
                                    return total;
                                  }, 0)}
                                </div>
                                <p className="text-xs text-gray-500">{t('offers.totalDocuments')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="terms" className="space-y-4 mt-0">
                  <Card className="p-6 bg-white space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">{t('offers.paymentTerms')}</Label>
                        <Textarea
                          placeholder={t('offers.enterPaymentTerms')}
                          rows={3}
                          value={offerData.paymentTerms}
                          onChange={(e) => setOfferData({ ...offerData, paymentTerms: e.target.value })}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">{t('offers.deliveryTerms')}</Label>
                        <Textarea
                          placeholder={t('offers.enterDeliveryTerms')}
                          rows={3}
                          value={offerData.deliveryTerms}
                          onChange={(e) => setOfferData({ ...offerData, deliveryTerms: e.target.value })}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">{t('offers.additionalNotes')}</Label>
                        <Textarea
                          placeholder={t('offers.enterAdditionalNotes')}
                          rows={4}
                          value={offerData.notes}
                          onChange={(e) => setOfferData({ ...offerData, notes: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Fixed Footer with Navigation Buttons */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t px-6 py-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                {/* Validation Errors */}
                <div className="flex-1">
                  {validationErrors.length > 0 && (
                    <div className="text-sm text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
                      {validationErrors[0]}
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}
                    className="h-10 px-6"
                  >
                    {t('common.cancel')}
                  </Button>

                  {currentTab !== 'details' && (
                    <Button
                      variant="outline"
                      onClick={handlePreviousTab}
                      className="h-10 px-6"
                    >
                      <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                      {t('offers.previous')}
                    </Button>
                  )}

                  {currentTab !== 'terms' ? (
                    <Button
                      onClick={handleNextTab}
                      className="h-10 px-6 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-medium shadow-lg"
                    >
                      {t('common.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => isEditMode ? handleUpdateOffer(true) : handleCreateOffer(true)}
                      disabled={isCreatingOffer}
                      className="h-10 px-6 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreatingOffer ? (
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {isCreatingOffer ? t('offers.saving') : (isEditMode ? t('offers.updateAndSend') : t('offers.saveAndSend'))}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Sharing Modal After Save */}
      {showEmailModalAfterSave && savedOfferForEmail && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Send className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('offers.offerSavedSuccess')}</h3>
                  <p className="text-sm text-gray-500">{t('offers.howToShare')}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 font-medium">📄 {savedOfferForEmail.offerNumber}</span>
                </div>
                <p className="text-sm text-gray-700">{savedOfferForEmail.title}</p>
                <p className="text-sm text-gray-600">
                  {t('offers.total')}: {getCurrencySymbol(savedOfferForEmail.currency)}
                  {savedOfferForEmail.totalAmount?.toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={async () => {
                    await handleEmailOffer(savedOfferForEmail);
                    setShowEmailModalAfterSave(false);
                    setSavedOfferForEmail(null);
                  }}
                  className="w-full h-12 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-medium shadow-lg"
                  disabled={isSharing === savedOfferForEmail.id}
                >
                  {isSharing === savedOfferForEmail.id ? (
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {t('offers.sendToClient')}
                </Button>

                <Button
                  onClick={async () => {
                    await handleShareOfferLink(savedOfferForEmail);
                    setShowEmailModalAfterSave(false);
                    setSavedOfferForEmail(null);
                  }}
                  variant="outline"
                  className="w-full h-10"
                  disabled={isSharing === savedOfferForEmail.id}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {t('offers.shareOfferLink')}
                </Button>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowEmailModalAfterSave(false);
                    setSavedOfferForEmail(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  {t('offers.skipForNow')}
                </Button>
                <Button
                  onClick={() => {
                    handleDownloadOffer(savedOfferForEmail);
                    setShowEmailModalAfterSave(false);
                    setSavedOfferForEmail(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('offers.downloadPdf')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('offers.totalOffers')}</p>
          <p className="text-gray-900">{offers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('offers.draft')}</p>
          <p className="text-gray-900">{offers.filter(o => displayOfferStatus(o) === 'draft').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('offers.sent')}</p>
          <p className="text-gray-900">{offers.filter(o => displayOfferStatus(o) === 'sent').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('offers.expired')}</p>
          <p className="text-gray-900">{offers.filter(o => displayOfferStatus(o) === 'expired').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('offers.accepted')}</p>
          <p className="text-gray-900">{offers.filter(o => displayOfferStatus(o) === 'accepted').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('offers.totalValue')}</p>
          <p className="text-gray-900">{getCurrencySymbol('eur')}{offers.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}</p>
        </Card>
      </div>

      {/* Offers Table */}
      <div className="relative">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('offers.offerNumber')}</TableHead>
                  <TableHead>{t('offers.client')}</TableHead>
                  <TableHead>{t('offers.title')}</TableHead>
                  <TableHead>{t('offers.date')}</TableHead>
                  <TableHead>{t('offers.items')}</TableHead>
                  <TableHead>{t('offers.totalAmount')}</TableHead>
                  <TableHead>{t('offers.status')}</TableHead>
                  <TableHead>{t('offers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isInitialLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2">
                        <Loader className="w-8 h-8 animate-spin text-gray-400" />
                        <span className="text-gray-500">{t('offers.loadingOffers')}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOffers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900 mb-1">{t('offers.noOffersFound')}</p>
                          <p className="text-sm text-gray-500">
                            {searchQuery || statusFilter !== 'all'
                              ? t('offers.tryAdjustFilters')
                              : t('offers.getStarted')
                            }
                          </p>
                        </div>
                        {canEdit && !searchQuery && statusFilter === 'all' && (
                          <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="mt-2"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('offers.createFirstOffer')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="text-gray-900">{offer.offerNumber}</TableCell>
                      <TableCell className="text-gray-900">{offer.client}</TableCell>
                      <TableCell className="text-gray-600 max-w-[200px] truncate">{offer.title}</TableCell>
                      <TableCell className="text-gray-600">{new Date(offer.offerDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-gray-900">{offer.items?.length || 0}</TableCell>
                      <TableCell className="text-gray-900">
                        {getCurrencySymbol(offer.currency)}{offer.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="relative flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {getStatusBadge(displayOfferStatus(offer))}
                          <Select
                            value={offer.offerStatus}
                            onValueChange={(value) => handleUpdateOfferStatus(offer.id, value)}
                            disabled={isUpdatingField === `${offer.id}-status`}
                          >
                            <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">{t('offers.draft')}</SelectItem>
                              <SelectItem value="sent">{t('offers.sent')}</SelectItem>
                              <SelectItem value="accepted">{t('offers.accepted')}</SelectItem>
                              <SelectItem value="rejected">{t('offers.rejected')}</SelectItem>
                              <SelectItem value="expired">{t('offers.expired')}</SelectItem>
                            </SelectContent>
                          </Select>
                          {isUpdatingField === `${offer.id}-status` && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                              <Loader className="w-3 h-3 animate-spin text-gray-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewOffer(offer)}
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title={t('offers.viewOfferDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadOffer(offer)}
                            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title={t('offers.downloadPdf')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDropdownToggle(offer.id, e, 'email')}
                            className="h-8 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title={t('offers.emailOptions')}
                            disabled={isSharing === offer.id}
                          >
                            {isSharing === offer.id ? (
                              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDropdownToggle(offer.id, e, 'actions')}
                            className="h-8 px-2"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* View Offer Dialog - Enhanced Full Screen */}
      {isViewDialogOpen && selectedOfferForView && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white w-full h-full max-w-none flex flex-col">
            {/* Header */}
            <div className="border-b px-6 py-4 flex-shrink-0 bg-white flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  Offer Details - {selectedOfferForView.offerNumber}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete offer information and items
                </p>
              </div>
              <button
                onClick={() => setIsViewDialogOpen(false)}
                className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
              <div className="w-full max-w-7xl mx-auto space-y-6">

                {/* Offer Header Card */}
                <Card className="p-6 bg-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('offers.offerInformation')}</h3>
                      <p className="text-sm text-gray-500">{t('offers.basicOfferDetails')}</p>
                    </div>
                    <div className="ml-auto">
                      {getStatusBadge(displayOfferStatus(selectedOfferForView))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">{t('offers.client')}</Label>
                        <p className="text-gray-900 font-medium text-lg mt-1">{selectedOfferForView.client}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">{t('offers.offerNumber')}</Label>
                        <p className="text-gray-900 font-mono text-sm mt-1 bg-gray-100 px-2 py-1 rounded">
                          {selectedOfferForView.offerNumber}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">{t('offers.offerDate')}</Label>
                        <p className="text-gray-900 mt-1">{new Date(selectedOfferForView.offerDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">{t('offers.currency')}</Label>
                        <p className="text-gray-900 mt-1 uppercase font-medium">
                          {selectedOfferForView.currency === 'eur' ? t('offers.currencyEur') :
                            selectedOfferForView.currency === 'usd' ? t('offers.currencyUsd') : t('offers.currencyAll')}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">{t('offers.totalAmountLabel')}</Label>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          {getCurrencySymbol(selectedOfferForView.currency)}{selectedOfferForView.totalAmount?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">{t('offers.projectTitle')}</Label>
                      <p className="text-gray-900 font-medium text-lg mt-1">{selectedOfferForView.title}</p>
                    </div>
                  </div>
                </Card>

                {/* Offer Items Card */}
                <Card className="p-6 bg-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('offers.offerItems')}</h3>
                      <p className="text-sm text-gray-500">{t('offers.itemsIncluded')}</p>
                    </div>
                    <div className="ml-auto">
                      <Badge variant="outline" className="text-sm">
                        {t('offers.itemsCount', { count: selectedOfferForView.items?.length || 0 })}
                      </Badge>
                    </div>
                  </div>

                  {selectedOfferForView.items && selectedOfferForView.items.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">#</TableHead>
                            <TableHead className="font-semibold">{t('offers.itemName')}</TableHead>
                            <TableHead className="font-semibold">{t('offers.type')}</TableHead>
                            <TableHead className="font-semibold text-center">{t('offers.quantity')}</TableHead>
                            <TableHead className="font-semibold text-right">{t('offers.unitPrice')}</TableHead>
                            <TableHead className="font-semibold text-right">{t('offers.discount')}</TableHead>
                            <TableHead className="font-semibold text-right">{t('offers.total')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOfferForView.items.map((item: any, index: number) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-500">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium max-w-xs">
                                <div className="whitespace-normal break-words leading-tight py-2" title={item.name}>
                                  {item.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.type === 'product' ? 'default' : item.type === 'service' ? 'outline' : 'secondary'}
                                  className="text-xs"
                                >
                                  {item.type === 'product' ? `📦 ${t('offers.product')}` :
                                    item.type === 'service' ? `🔧 ${t('offers.service')}` : `🎁 ${t('offers.servicePackage')}`}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {getCurrencySymbol(selectedOfferForView.currency)}{item.unitPrice?.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-red-600 font-mono">
                                {item.discount ? `${item.discount}%` : '0%'}
                              </TableCell>
                              <TableCell className="text-right font-bold font-mono">
                                {getCurrencySymbol(selectedOfferForView.currency)}{item.total?.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
                      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">{t('offers.noItemsInOffer')}</p>
                    </div>
                  )}
                </Card>

                {/* Financial Summary Card */}
                <Card className="p-6 bg-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold">€</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('offers.financialSummary')}</h3>
                      <p className="text-sm text-gray-500">{t('offers.costBreakdown')}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">{t('offers.subtotal')}:</span>
                          <span className="font-mono text-lg">
                            {getCurrencySymbol(selectedOfferForView.currency)}{selectedOfferForView.subtotal?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">{t('offers.discount')}:</span>
                          <span className="font-mono text-lg text-red-600">
                            -{getCurrencySymbol(selectedOfferForView.currency)}{selectedOfferForView.discount?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                          <span className="text-xl font-bold text-gray-900">{t('offers.totalAmountLabel')}:</span>
                          <span className="text-2xl font-bold text-blue-600 font-mono">
                            {getCurrencySymbol(selectedOfferForView.currency)}{selectedOfferForView.totalAmount?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Terms and Notes Card */}
                {(selectedOfferForView.paymentTerms || selectedOfferForView.deliveryTerms || selectedOfferForView.notes) && (
                  <Card className="p-6 bg-white">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{t('offers.termsAndNotes')}</h3>
                        <p className="text-sm text-gray-500">{t('offers.paymentDeliveryNotes')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedOfferForView.paymentTerms && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            💳 {t('offers.paymentTermsLabel')}
                          </Label>
                          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                            <p className="text-gray-900 text-sm leading-relaxed">
                              {selectedOfferForView.paymentTerms}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedOfferForView.deliveryTerms && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            🚚 {t('offers.deliveryTermsLabel')}
                          </Label>
                          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
                            <p className="text-gray-900 text-sm leading-relaxed">
                              {selectedOfferForView.deliveryTerms}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedOfferForView.notes && (
                      <div className="mt-6 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          📝 {t('offers.additionalNotesLabel')}
                        </Label>
                        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                          <p className="text-gray-900 text-sm leading-relaxed">
                            {selectedOfferForView.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* Action Buttons */}
                <Card className="p-6 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{t('offers.quickActions')}</h3>
                      <p className="text-sm text-gray-500">{t('offers.downloadShareManage')}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleDownloadOffer(selectedOfferForView)}
                        variant="outline"
                        className="h-10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button
                        onClick={() => handleEmailOffer(selectedOfferForView)}
                        className="h-10 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-medium shadow-lg"
                        disabled={isSharing === selectedOfferForView.id}
                      >
                        {isSharing === selectedOfferForView.id ? (
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 mr-2" />
                        )}
                        {t('offers.sendToClient')}
                      </Button>
                    </div>
                  </div>
                </Card>

              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-white flex-shrink-0">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="text-sm text-gray-500">
                  Created on {new Date(selectedOfferForView.createdAt).toLocaleDateString()} at {new Date(selectedOfferForView.createdAt).toLocaleTimeString()}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="h-10 px-6"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('offers.deleteOffer')}</DialogTitle>
            <DialogDescription>
              {t('offers.deleteConfirm')} {t('offers.deleteConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedOfferForDelete && (
            <div className="py-4">
              <p className="text-sm text-gray-600">
                <strong>{t('offers.offerLabel')}:</strong> {selectedOfferForDelete.offerNumber} - {selectedOfferForDelete.title}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t('offers.client')}:</strong> {selectedOfferForDelete.client}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t('offers.totalAmountLabel')}:</strong> {getCurrencySymbol(selectedOfferForDelete.currency)}{selectedOfferForDelete.totalAmount?.toFixed(2)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOffer}>
              {t('offers.deleteOffer')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Export Dialog */}
      <OfferExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        offers={offers}
      />

      {/* Custom Dropdown Menu */}
      {openDropdownId && dropdownPosition && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeDropdown}
          />
          <div
            className={`fixed z-[9999] min-w-[180px] bg-white border border-gray-200 rounded-md shadow-lg py-1 transition-all duration-150 ease-out ${dropdownPosition.openUpward
              ? 'animate-in slide-in-from-bottom-1 fade-in-0'
              : 'animate-in slide-in-from-top-1 fade-in-0'
              }`}
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            {dropdownType === 'email' ? (
              // Email Options Only
              <>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                  {t('offers.emailOptions')}
                </div>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center disabled:opacity-50 transition-colors duration-150"
                  onClick={() => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) handleEmailOffer(offer);
                    closeDropdown();
                  }}
                  disabled={isSharing === openDropdownId}
                >
                  {isSharing === openDropdownId ? (
                    <div className="w-4 h-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {t('offers.sendToClient')}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center disabled:opacity-50 transition-colors duration-150"
                  onClick={() => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) handleShareOfferLink(offer);
                    closeDropdown();
                  }}
                  disabled={isSharing === openDropdownId}
                >
                  {isSharing === openDropdownId ? (
                    <div className="w-4 h-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {t('offers.shareOfferLink')}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center disabled:opacity-50 transition-colors duration-150"
                  onClick={async () => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) await handleGmailShare(offer);
                    closeDropdown();
                  }}
                  disabled={isSharing === openDropdownId}
                >
                  {isSharing === openDropdownId ? (
                    <div className="w-4 h-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="w-4 h-4 mr-2">📧</span>
                  )}
                  {t('offers.gmail')}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center disabled:opacity-50 transition-colors duration-150"
                  onClick={async () => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) await handleOutlookShare(offer);
                    closeDropdown();
                  }}
                  disabled={isSharing === openDropdownId}
                >
                  {isSharing === openDropdownId ? (
                    <div className="w-4 h-4 mr-2 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="w-4 h-4 mr-2">📮</span>
                  )}
                  {t('offers.outlook')}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                  onClick={() => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) copyOfferToClipboard(offer);
                    closeDropdown();
                  }}
                >
                  <span className="w-4 h-4 mr-2">📋</span>
                  {t('offers.copyDetails')}
                </button>
              </>
            ) : (
              // General Actions Only
              <>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                  {t('common.actions')}
                </div>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                  onClick={() => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) handleViewOffer(offer);
                    closeDropdown();
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('offers.viewOfferDetails')}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                  onClick={() => {
                    const offer = offers.find(o => o.id === openDropdownId);
                    if (offer) handleDownloadOffer(offer);
                    closeDropdown();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('offers.downloadPdf')}
                </button>
                {canEdit && (
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center transition-colors duration-150"
                    onClick={() => {
                      const offer = offers.find(o => o.id === openDropdownId);
                      if (offer) handleEditOffer(offer);
                      closeDropdown();
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t('offers.editOffer')}
                  </button>
                )}
                {canDelete && (
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600 transition-colors duration-150"
                    onClick={() => {
                      const offer = offers.find(o => o.id === openDropdownId);
                      if (offer) handleDeleteOffer(offer);
                      closeDropdown();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('common.delete')}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
