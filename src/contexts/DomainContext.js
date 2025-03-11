import React, { createContext, useState, useContext } from 'react';

const DomainContext = createContext();

export function DomainProvider({ children }) {
    const [domain, setDomain] = useState('localhost');

    return (
        <DomainContext.Provider value={{ domain, setDomain }}>
            {children}
        </DomainContext.Provider>
    );
}

export function useDomain() {
    return useContext(DomainContext);
} 