'use client';
import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';

const Home = (props) => {
    const [data, setData] = useState('No result');

    return (
    <>
        <QrReader
            onResult={(result, error) => {
                if (!!result) {
                    setData(result?.text);
                }

                if (!!error) {
                    console.info(error);
                }
            }}
            constraints={{ facingMode: 'environment' }}
            style={{ width: '40%', height: '40%' }}
            legacyMode="true"
        />
        <p>{data}</p>
    </>
    );
};
export default Home;