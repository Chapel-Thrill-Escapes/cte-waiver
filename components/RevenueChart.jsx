// components/RevenueChart.jsx
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import ApexCharts to prevent SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const RevenueChart = ({ data }) => {
  const [chartOptions, setChartOptions] = useState({});
  const [chartSeries, setChartSeries] = useState([]);

  useEffect(() => {
    if (!Array.isArray(data)) return;

    // Process data to group by date and sum amounts
    const revenueData = data.reduce((acc, booking) => {
      if (booking.isCanceled) return acc; // Skip canceled bookings in revenue calculation
      
      const date = new Date(booking.creationDate).toLocaleDateString();
      if (!date) return acc;
      
      acc[date] = (acc[date] || 0) + parseFloat(booking.amount || 0);
      return acc;
    }, {});

    // Sort dates chronologically
    const sortedDates = Object.keys(revenueData).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    const options = {
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        }
      },
      xaxis: {
        categories: sortedDates,
        title: {
          text: 'Date',
          style: {
            fontSize: '14px',
            fontWeight: 600
          }
        },
        labels: {
          rotate: -45,
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Revenue',
          style: {
            fontSize: '14px',
            fontWeight: 600
          }
        },
        labels: {
          formatter: (value) => `$${value.toFixed(2)}`,
          style: {
            fontSize: '12px'
          }
        }
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (value) => `$${value.toFixed(2)}`,
          title: {
            formatter: () => 'Amount: '
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      grid: {
        row: {
          colors: ['#000000', '#000000'],
          opacity: 0.5
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: {
            height: 300
          },
          xaxis: {
            labels: {
              rotate: -45
            }
          }
        }
      }]
    };

    const series = [{
      name: 'Revenue',
      data: sortedDates.map(date => revenueData[date])
    }];

    setChartOptions(options);
    setChartSeries(series);
  }, [data]);

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
        No booking data available for the selected period
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Booking Revenue</h2>
      {typeof window !== 'undefined' && (
        <Chart
          options={chartOptions}
          series={chartSeries}
          type="line"
          height={400}
          className="apexcharts-canvas"
        />
      )}
    </div>
  );
};

export default RevenueChart;