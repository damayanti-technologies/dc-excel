import { ChartTemplate } from '@/types/chart';

export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean business palette with subtle grid lines and balanced contrast.',
    style: {
      paletteId: 'professional',
      borderRadius: 8,
    },
    axes: {
      showGridLinesX: false,
      showGridLinesY: true,
    },
    legend: {
      show: true,
      position: 'top',
    },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Crisp corporate teals and deep blues with formal typography.',
    style: {
      paletteId: 'corporate',
      borderRadius: 6,
    },
    axes: {
      showGridLinesX: false,
      showGridLinesY: true,
    },
    legend: {
      show: true,
      position: 'bottom',
    },
  },
  {
    id: 'modern',
    name: 'Modern SaaS',
    description: 'Vibrant indigo and emerald tones with smooth rounded cards.',
    style: {
      paletteId: 'modern',
      borderRadius: 12,
    },
    axes: {
      showGridLinesX: false,
      showGridLinesY: true,
    },
    legend: {
      show: true,
      position: 'top',
    },
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    description: 'High-clarity grayscale with zero distraction and crisp borders.',
    style: {
      paletteId: 'minimal',
      borderRadius: 4,
    },
    axes: {
      showGridLinesX: false,
      showGridLinesY: false,
    },
    legend: {
      show: true,
      position: 'top',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Single slate hue in graduated shades for publication.',
    style: {
      paletteId: 'monochrome',
      borderRadius: 6,
    },
    axes: {
      showGridLinesX: false,
      showGridLinesY: true,
    },
    legend: {
      show: true,
      position: 'right',
    },
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'High-contrast bold saturated colors optimized for slideshows.',
    style: {
      paletteId: 'presentation',
      borderRadius: 8,
    },
    axes: {
      showGridLinesX: true,
      showGridLinesY: true,
    },
    legend: {
      show: true,
      position: 'top',
    },
  },
];
