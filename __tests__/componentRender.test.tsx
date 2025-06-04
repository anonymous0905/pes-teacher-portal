import { render, screen } from '@testing-library/react';
import React from 'react';

import RootLayout from '../app/layout';
import LoginPage from '../app/page';
import DashboardPage from '../app/dashboard/page';
import LineChart from '../app/dashboard/LineChart';
import SessionsPage from '../app/sessions/page';
import SemesterSectionSelector from '../app/sessions/SemesterSectionSelector';
import SignupPage from '../app/signup/page';
import QuestionsPage from '../app/questions/page';
import VerifySessionPage from '../app/verify/page';
import AnalyticsPage from '../app/analytics/page';
import ClassCreatePage from '../app/classcreate/page';
import SubmitLogPage from '../app/submit/page';
import AccountPage from '../app/myaccount/page';

// Simple smoke tests ensuring components render without crashing

describe('Component rendering', () => {
  it('renders layout children', () => {
    render(<RootLayout><p>hello</p></RootLayout>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('renders login page', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Faculty Sign in/i)).toBeInTheDocument();
  });

  it('renders dashboard page', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Previous Sessions/i)).toBeInTheDocument();
  });

  it('renders line chart component', () => {
    expect(() => render(<LineChart />)).not.toThrow();
  });

  it('renders sessions page', () => {
    render(<SessionsPage />);
    expect(screen.getAllByText(/Sessions/i).length).toBeGreaterThan(0);
  });

  it('renders semester selector', () => {
    render(<SemesterSectionSelector />);
    expect(screen.getByText(/Select Semester and Section/i)).toBeInTheDocument();
  });

  it('renders signup page', () => {
    render(<SignupPage />);
    expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
  });

  it('renders questions page', () => {
    render(<QuestionsPage />);
    expect(screen.getByText(/Questions/i)).toBeInTheDocument();
  });

  it('renders verify page', () => {
    render(<VerifySessionPage />);
    expect(screen.getAllByText(/Verify Session/i).length).toBeGreaterThan(0);
  });

  it('renders analytics page', () => {
    render(<AnalyticsPage />);
    expect(screen.getByText(/Class-wise Analytics/i)).toBeInTheDocument();
  });

  it('renders classcreate page', () => {
    render(<ClassCreatePage />);
    expect(screen.getByText(/Bulk Session Creation/i)).toBeInTheDocument();
  });

  it('renders submit log page', () => {
    render(<SubmitLogPage />);
    expect(screen.getAllByText(/Submit Log/i).length).toBeGreaterThan(0);
  });

  it('renders account page', () => {
    render(<AccountPage />);
    expect(screen.getAllByText(/My Account/i).length).toBeGreaterThan(0);
  });
});
