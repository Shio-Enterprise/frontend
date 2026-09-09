import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../../../context/AuthContext';
import SignUpPage from './index';

describe('SignUpPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <GoogleOAuthProvider clientId="test-client-id">
          <AuthProvider>
            <SignUpPage />
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    );
    const headline = screen.getByText(/Bem vindo/i);
    expect(headline).toBeInTheDocument();
  });
});
