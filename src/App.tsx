import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LandingHome } from './components/LandingHome';
import { PublicMenu } from './components/PublicMenu';
import { AdminDashboard } from './components/AdminDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { Footer } from './components/Footer';
import { getStoredRestaurant } from './services/store';
import { RestaurantInfo } from './types';

export default function App() {
  const getInitialView = (): 'landing' | 'menu' | 'admin' | 'superadmin' => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    if (
      params.get('view') === 'superadmin' ||
      params.get('view') === 'agency' ||
      params.has('agency') ||
      pathname.endsWith('/agency') ||
      pathname.endsWith('/superadmin') ||
      hash === '#/agency' ||
      hash === '#/superadmin' ||
      hash === '#agency'
    ) {
      return 'superadmin';
    }
    if (
      params.get('view') === 'menu' || 
      params.has('table') || 
      params.has('t') || 
      params.has('tavolo') || 
      params.has('restaurant') || 
      params.has('r') || 
      params.has('rest') || 
      hash === '#/menu'
    ) return 'menu';
    if (params.get('view') === 'admin' || hash === '#/admin') return 'admin';
    return 'landing';
  };

  const [currentView, setCurrentView] = useState<'landing' | 'menu' | 'admin' | 'superadmin'>(getInitialView);
  const [restaurant, setRestaurant] = useState<RestaurantInfo>(() => {
    const params = new URLSearchParams(window.location.search);
    const restParam = params.get('restaurant') || params.get('r') || params.get('rest');
    return getStoredRestaurant(restParam || undefined);
  });

  const handleNavigate = useCallback((view: 'landing' | 'menu' | 'admin' | 'superadmin') => {
    setCurrentView(view);
    const url = new URL(window.location.href);
    if (view === 'superadmin') {
      url.searchParams.set('view', 'superadmin');
    } else if (view === 'menu') {
      url.searchParams.set('view', 'menu');
    } else if (view === 'admin') {
      url.searchParams.set('view', 'admin');
    } else {
      url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url.toString());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restParam = params.get('restaurant') || params.get('r') || params.get('rest');
    if (restParam) {
      const matched = getStoredRestaurant(restParam);
      if (matched) {
        setRestaurant(matched);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setRestaurant(getStoredRestaurant());
    };
    window.addEventListener('menulab_data_updated', handleUpdate);
    return () => window.removeEventListener('menulab_data_updated', handleUpdate);
  }, []);

  // When visiting via the dedicated agency URL, render the full-screen agency portal
  if (currentView === 'superadmin') {
    return (
      <SuperAdminDashboard
        onBackToApp={() => handleNavigate('landing')}
        onNavigateView={handleNavigate}
        onSelectRestaurant={(restId) => {
          const selected = getStoredRestaurant(restId);
          setRestaurant(selected);
          const url = new URL(window.location.href);
          url.searchParams.set('view', 'admin');
          url.searchParams.set('restaurant', restId);
          window.history.pushState({}, '', url.toString());
          setCurrentView('admin');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-amber-500 selection:text-white flex flex-col justify-between">
      <div>
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          restaurantName={restaurant.name}
        />

        <main>
          {currentView === 'landing' && (
            <LandingHome onNavigate={handleNavigate} restaurant={restaurant} />
          )}
          {currentView === 'menu' && (
            <PublicMenu />
          )}
          {currentView === 'admin' && (
            <AdminDashboard onNavigateToSuperAdmin={() => handleNavigate('superadmin')} />
          )}
        </main>
      </div>

      <Footer onOpenSuperAdmin={() => handleNavigate('superadmin')} />
    </div>
  );
}
