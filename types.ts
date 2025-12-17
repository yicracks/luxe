import React from 'react';

export interface GiftContent {
  id: string;
  name: string;
  icon: React.ElementType; // Icon component
  color: string;
}

export interface GiftState {
  id: string;
  isOpen: boolean;
  content: GiftContent;
  x: number; // Position relative to tree center
  y: number; // Position relative to tree bottom
  rotation: number;
}