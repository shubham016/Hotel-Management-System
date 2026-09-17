import React, { Suspense, lazy } from 'react';
import { Location, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import PublicLayout from '@/layouts/PublicLayout';
import AdminLayout from '@/layouts/AdminLayout';
import { BookingModal } from '@/components/booking/BookingModal';

const Home = lazy(() => import('@/pages/public/home/page'));
const About = lazy(() => import('@/pages/public/about/page'));
const Rooms = lazy(() => import('@/pages/public/rooms/page'));
const Dining = lazy(() => import('@/pages/public/dining/page'));
const Banquet = lazy(() => import('@/pages/public/banquet/page'));
const Offers = lazy(() => import('@/pages/public/offers/page'));
const Contact = lazy(() => import('@/pages/public/contact/page'));
const Book = lazy(() => import('@/pages/public/book/page'));
const Login = lazy(() => import('@/pages/auth/login/page'));
const Dashboard = lazy(() => import('@/pages/admin/dashboard/page'));
const Apps = lazy(() => import('@/pages/admin/apps/page'));
const Reservations = lazy(() => import('@/pages/admin/pms/reservations/page'));
const RoomStatus = lazy(() => import('@/pages/admin/pms/rooms/page'));
const FrontDesk = lazy(() => import('@/pages/admin/pms/frontdesk/page'));
const NightAudit = lazy(() => import('@/pages/admin/pms/night-audit/page'));
const Tables = lazy(() => import('@/pages/admin/pos/tables/page'));
const Kot = lazy(() => import('@/pages/admin/pos/kot/page'));
const BanquetAdmin = lazy(() => import('@/pages/admin/banquet/page'));
const Housekeeping = lazy(() => import('@/pages/admin/housekeeping/page'));
const Inventory = lazy(() => import('@/pages/admin/inventory/page'));
const Procurement = lazy(() => import('@/pages/admin/procurement/page'));
const Crm = lazy(() => import('@/pages/admin/crm/page'));
const ChartOfAccounts = lazy(() => import('@/pages/admin/accounting/chart-of-accounts/page'));
const Journals = lazy(() => import('@/pages/admin/accounting/journals/page'));
const Reports = lazy(() => import('@/pages/admin/accounting/reports/page'));
const CmsPages = lazy(() => import('@/pages/admin/cms/pages/page'));
const HotelSetup = lazy(() => import('@/pages/admin/cms/hotel-setup/page'));
const Settings = lazy(() => import('@/pages/admin/settings/page'));
const AuditLogs = lazy(() => import('@/pages/admin/audit-logs/page'));

const fallback = <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>Loading…</div>;

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const showBookingModal = Boolean(backgroundLocation && location.pathname === '/book');

  return <Suspense fallback={fallback}><Routes location={backgroundLocation || location}>
    <Route element={<PublicLayout><Outlet /></PublicLayout>}>
      <Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/rooms" element={<Rooms />} /><Route path="/dining" element={<Dining />} /><Route path="/banquet" element={<Banquet />} /><Route path="/offers" element={<Offers />} /><Route path="/contact" element={<Contact />} /><Route path="/book" element={<Book />} />
    </Route>
    <Route path="/login" element={<Login />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<Navigate to="dashboard" replace />} /><Route path="dashboard" element={<Dashboard />} /><Route path="apps" element={<Apps />} />
      <Route path="pms/reservations" element={<Reservations />} /><Route path="pms/rooms" element={<RoomStatus />} /><Route path="pms/frontdesk" element={<FrontDesk />} /><Route path="pms/night-audit" element={<NightAudit />} />
      <Route path="pos/tables" element={<Tables />} /><Route path="pos/kot" element={<Kot />} /><Route path="banquet" element={<BanquetAdmin />} /><Route path="housekeeping" element={<Housekeeping />} /><Route path="inventory" element={<Inventory />} /><Route path="procurement" element={<Procurement />} /><Route path="crm" element={<Crm />} />
      <Route path="accounting/chart-of-accounts" element={<ChartOfAccounts />} /><Route path="accounting/journals" element={<Journals />} /><Route path="accounting/reports" element={<Reports />} />
      <Route path="cms/pages" element={<CmsPages />} /><Route path="cms/hotel-setup" element={<HotelSetup />} /><Route path="settings" element={<Settings />} /><Route path="audit-logs" element={<AuditLogs />} />
    </Route>
    <Route path="*" element={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><h1>404</h1><p>This page could not be found.</p></div></div>} />
  </Routes>
  {showBookingModal && (
    <BookingModal title="Book a Room" subtitle="Check live availability and create a secure direct reservation." onClose={() => navigate(-1)}>
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-main)' }}>
        <Book />
      </div>
    </BookingModal>
  )}</Suspense>;
}
