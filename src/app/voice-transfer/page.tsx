'use client';

import React from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import VoiceTransferInterface from '@/components/VoiceTransferInterface';

export default function VoiceTransferPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <VoiceTransferInterface />
      </Layout>
    </ProtectedRoute>
  );
}
