
import React from 'react';
import { ProgressCircle } from './ProgressCircle';
import { Card } from './Card';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { DashboardMetrics } from '../../types';

interface StrategicDashboardProps {
  metrics: DashboardMetrics;
}

const StrategicDashboard: React.FC<StrategicDashboardProps> = ({ metrics }) => {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div>
          <h4 className="text-sm font-semibold text-gray-400">Brief Generation</h4>
          <div className="mt-2 flex justify-center">
            <ProgressCircle percentage={metrics.briefGenerationProgress} />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-400">Knowledge Domain Coverage</h4>
          <div className="mt-2 flex justify-center">
            <ProgressCircle percentage={metrics.knowledgeDomainCoverage} color="#16a34a" />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-400">Avg. EAVs / Brief</h4>
           <p className="text-4xl font-bold text-white mt-4">{metrics.avgEAVsPerBrief.toFixed(1)}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-400">Contextual Flow Score</h4>
           <div className="mt-2 flex justify-center">
            <ProgressCircle percentage={metrics.contextualFlowScore} color="#c026d3" />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StrategicDashboard;
