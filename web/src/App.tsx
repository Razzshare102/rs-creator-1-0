import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import OwnerGate from './components/OwnerGate';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import Overview from './pages/Overview';
import ReplyGenerator from './pages/ReplyGenerator';
import PostEvaluator from './pages/PostEvaluator';
import FeedAssistant from './pages/FeedAssistant';
import AccountMonitor from './pages/AccountMonitor';
import LinkQueue from './pages/LinkQueue';
import ContentCreator from './pages/ContentCreator';
import ActivityHistory from './pages/ActivityHistory';
import ApiSettings from './pages/ApiSettings';
import Subscription from './pages/Subscription';
import Profile from './pages/Profile';
import Help from './pages/Help';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import UserManagement from './pages/admin/UserManagement';
import LicenseManagement from './pages/admin/LicenseManagement';
import SubscriptionPlans from './pages/admin/SubscriptionPlans';
import FeatureControl from './pages/admin/FeatureControl';
import AiProviders from './pages/admin/AiProviders';
import ApiUsage from './pages/admin/ApiUsage';
import Analytics from './pages/admin/Analytics';
import ActivityLogs from './pages/admin/ActivityLogs';
import AuditLogs from './pages/admin/AuditLogs';
import SystemSettings from './pages/admin/SystemSettings';
import ExtensionUpdates from './pages/admin/ExtensionUpdates';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="reply-generator" element={<ReplyGenerator />} />
          <Route path="post-evaluator" element={<PostEvaluator />} />
          <Route path="feed-assistant" element={<FeedAssistant />} />
          <Route path="account-monitor" element={<AccountMonitor />} />
          <Route path="link-queue" element={<LinkQueue />} />
          <Route path="content-creator" element={<ContentCreator />} />
          <Route path="activity" element={<ActivityHistory />} />
          <Route path="api-settings" element={<ApiSettings />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<Help />} />
        </Route>

        <Route element={<OwnerGate />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="licenses" element={<LicenseManagement />} />
            <Route path="plans" element={<SubscriptionPlans />} />
            <Route path="features" element={<FeatureControl />} />
            <Route path="providers" element={<AiProviders />} />
            <Route path="api-usage" element={<ApiUsage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="settings" element={<SystemSettings />} />
            <Route path="extension-updates" element={<ExtensionUpdates />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
