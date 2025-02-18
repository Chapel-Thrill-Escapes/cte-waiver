"use client";

import { useState } from 'react';
import useSWR from 'swr';
import RevenueChart from 'components/RevenueChart';

const apiToken = process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN;
const fetcher = (url) => fetch(url, {
    headers: {
      'x-internal-token': apiToken
    }
  }).then((res) => res.json());

  export default function Home() {
    const [includeCanceled, setIncludeCanceled] = useState(false);
    const [dateRange, setDateRange] = useState({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    });
  
    const { data, error, isValidating, mutate } = useSWR(
      `/analytics/bookings?startTime=${dateRange.start}T00:00:00Z&endTime=${dateRange.end}T23:59:59Z`,
      fetcher,
      { 
        refreshInterval: 300000,
        revalidateOnFocus: false
      }
    );
  
    // Add handleRefresh function
    const handleRefresh = () => {
      mutate();
    };
  
    // Update date change handler to include validation
    const handleDateChange = (e) => {
      const newDate = e.target.value;
      if (new Date(newDate) > new Date()) {
        return; // Prevent future dates
      }
      setDateRange(prev => ({
        ...prev,
        [e.target.name]: newDate
      }));
    };
    
    // Filter data based on cancellation status
    const filteredData = includeCanceled 
      ? data 
      : data?.filter(booking => !booking.isCanceled) || [];
  
    // Loading overlay component
    const LoadingOverlay = () => (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
            <h1 className="text-2xl font-bold">Booking Revenue Dashboard</h1>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex gap-2">
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateChange}
                  className="px-4 py-2 border rounded"
                  max={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateChange}
                  className="px-4 py-2 border rounded"
                  max={new Date().toISOString().split('T')[0]}
                />
                {/* Add Refresh Button */}
                <button 
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">↻</span>
                      Refreshing...
                    </span>
                  ) : 'Refresh Data'}
                </button>
              </div>
              
              {/* Replace currency filter with cancellation filter */}
              <div className="flex items-center gap-2">
                <label htmlFor="includeCanceled" className="text-sm font-medium">
                  Include Canceled Bookings:
                </label>
                <input
                  type="checkbox"
                  id="includeCanceled"
                  checked={includeCanceled}
                  onChange={(e) => setIncludeCanceled(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
        </div>

        <div className="relative">
          {isValidating && <LoadingOverlay />}
          
          {error ? (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              Error loading data
            </div>
          ) : data ? (
            <>
                <RevenueChart data={filteredData} />

                <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredData.map(booking => (
                        <div key={booking.id} className="p-4 bg-white rounded-lg shadow">
                            <div className="text-sm text-gray-500">
                                {new Date(booking.creationDate).toLocaleDateString()}
                            </div>
                            <div className="text-lg font-semibold">
                                {booking.isCanceled} {booking.amount.toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            </>
          ) : (
            <div className="p-4 bg-blue-100 text-blue-700 rounded-lg">
              Initializing dashboard...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
