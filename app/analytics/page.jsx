"use client";

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';

const data = [
    { month: 'Jan', Revenue: 120000, Cost: 80000 },
    { month: 'Feb', Revenue: 150000, Cost: 90000 },
    { month: 'Mar', Revenue: 170000, Cost: 110000 },
    { month: 'Apr', Revenue: 140000, Cost: 95000 },
    { month: 'May', Revenue: 160000, Cost: 100000 },
    { month: 'Jun', Revenue: 180000, Cost: 120000 },
  ];  

export default function Page() {
    return (
        <main className="flex flex-col gap-8 sm:gap-16">
            <section className="flex flex-col items-start gap-3 sm:gap-4">
                <h1 className="mb-0 text-primary">Sales Analytics</h1>
            </section>
            <div style={{ height: '500px' }}>
                <ResponsiveBar
                data={data}
                keys={['Revenue', 'Cost']}
                indexBy="month"
                margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                padding={0.3}
                colors={{ scheme: 'nivo' }}
                borderColor={{
                    from: 'color',
                    modifiers: [['darker', 1.6]],
                }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Month',
                    legendPosition: 'middle',
                    legendOffset: 32,
                }}
                axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Amount ($)',
                    legendPosition: 'middle',
                    legendOffset: -40,
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{
                    from: 'color',
                    modifiers: [['darker', 1.6]],
                }}
                legends={[
                    {
                    dataFrom: 'keys',
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 120,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 0.85,
                    symbolSize: 20,
                    effects: [
                        {
                        on: 'hover',
                        style: {
                            itemOpacity: 1,
                        },
                        },
                    ],
                    },
                ]}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
                />
            </div>
        </main>
    );
}