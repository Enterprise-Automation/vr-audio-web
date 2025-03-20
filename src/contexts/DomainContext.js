import React, { createContext, useState, useContext } from 'react';

const DomainContext = createContext();

export function DomainProvider({ children }) {
    const [domain, setDomain] = useState('https://audio-response.hyades.clusters.easlab.co.uk');

    return (
        <DomainContext.Provider value={{ domain, setDomain }}>
            {children}
        </DomainContext.Provider>
    );
}

export function useDomain() {
    return useContext(DomainContext);
} 