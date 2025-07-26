import React from 'react';
import { Bar } from 'react-chartjs-2';

const ChartDisplay = ({ chartData }) => {
  return (
    <div className="my-6">
      <h2 className="text-xl font-bold mb-2">📊 Your Financial Overview</h2>
      <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
    </div>
  );
};

export default ChartDisplay;