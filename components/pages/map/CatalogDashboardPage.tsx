/**
 * CatalogDashboardPage - Persistent catalog access from the map dashboard
 *
 * Full catalog management interface accessible from the dashboard navigation.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import CatalogManager from '../../catalog/CatalogManager';

const CatalogDashboardPage: React.FC = () => {
  const { mapId } = useParams<{ mapId: string }>();

  if (!mapId) {
    return <div className="p-4 text-gray-400">No map selected.</div>;
  }

  return (
    <div className="h-full">
      <CatalogManager mapId={mapId} />
    </div>
  );
};

export default CatalogDashboardPage;
