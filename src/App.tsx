/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage, TeamPage, PrivacyPolicyPage, TermsPage } from './pages/AboutTeamPages';
import { CompetitionsListPage, CompetitionDetailPage } from './pages/CompetitionsPages';
import { RegisterPage, TrackRegistrationPage } from './pages/RegistrationPages';
import { VerifyCertificatePage, ParticipantPortalPage } from './pages/VerificationAndPortalPages';
import {
  GalleryPage,
  NoticesPage,
  NoticeDetailPage,
  LearningHubPage,
  ContactPage,
  NotFoundPage,
} from './pages/PublicContentPages';
import { JudgePortalPage } from './pages/JudgePortalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { OrganizerScannerPage } from './pages/OrganizerScannerPage';

function RouterView() {
  const { path } = useApp();
  const normalized = path === '/' ? '/' : path.replace(/\/+$/, '');

  if (normalized === '/') return <HomePage />;
  if (normalized === '/about') return <AboutPage />;
  if (normalized === '/competitions') return <CompetitionsListPage />;
  if (normalized.startsWith('/competitions/')) {
    const slug = normalized.slice('/competitions/'.length);
    return <CompetitionDetailPage slug={slug} />;
  }
  if (normalized === '/register') return <RegisterPage />;
  if (normalized === '/track') return <TrackRegistrationPage />;
  if (normalized === '/scanner' || normalized === '/verify/scanner') {
    return <OrganizerScannerPage />;
  }
  if (normalized === '/verify') return <VerifyCertificatePage />;
  if (normalized.startsWith('/verify/')) {
    const token = decodeURIComponent(normalized.slice('/verify/'.length));
    return <VerifyCertificatePage passToken={token} />;
  }
  if (normalized === '/portal') return <ParticipantPortalPage />;
  if (normalized === '/hub') return <LearningHubPage />;
  if (normalized === '/gallery') return <GalleryPage />;
  if (normalized === '/notices') return <NoticesPage />;
  if (normalized.startsWith('/notices/')) {
    const id = normalized.slice('/notices/'.length);
    return <NoticeDetailPage id={id} />;
  }
  if (normalized === '/team') return <TeamPage />;
  if (normalized === '/contact') return <ContactPage />;
  if (normalized === '/privacy') return <PrivacyPolicyPage />;
  if (normalized === '/terms') return <TermsPage />;
  if (normalized === '/judge') return <JudgePortalPage />;
  if (normalized === '/admin') return <AdminDashboardPage />;

  return <NotFoundPage />;
}

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <RouterView />
      </Layout>
    </AppProvider>
  );
}
