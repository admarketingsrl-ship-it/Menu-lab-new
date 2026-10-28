import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface FooterProps {
  onOpenSuperAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSuperAdmin }) => {
  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 text-zinc-400 py-8 px-4 text-center text-xs space-y-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-bold text-zinc-200">MenuLab SaaS - Piattaforma Digitale per Ristorazione</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Tutti i diritti riservati <span onClick={onOpenSuperAdmin} className="cursor-default select-none" title="MenuLab Agency">© 2026</span>. Powered by Firebase & Google Drive.
          </p>
        </div>

        <div className="text-[11px] text-zinc-500">
          Infrastruttura Cloud e PWA multi-ristorante
        </div>
      </div>
    </footer>
  );
};
