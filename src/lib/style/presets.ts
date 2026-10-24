import { defaultStyle, themes, type StyleState } from '#lib/style/schema.ts'

export const gradients = [
  { name: 'Daydream', colors: ['#b8a8f0', '#eabbd6', '#ffaf99'], angle: 135 },
  { name: 'Dusk', colors: ['#26304f', '#70629c', '#b79bad'], angle: 140 },
  { name: 'Apricot', colors: ['#f9d9a9', '#f3aa90', '#db7c88'], angle: 135 },
  { name: 'Glacier', colors: ['#c7e4ef', '#b5caed', '#d9d6f0'], angle: 145 },
  { name: 'Sage', colors: ['#d8dfcc', '#adc7b2', '#729b90'], angle: 145 },
  { name: 'Rosewater', colors: ['#f8e4e1', '#eac4cd', '#d7afc1'], angle: 135 },
  {
    name: 'After hours',
    colors: ['#181b30', '#35365b', '#58527e'],
    angle: 150
  },
  { name: 'Sand', colors: ['#f0e7db', '#e3cdb2', '#bca88f'], angle: 135 },
  { name: 'Lavender', colors: ['#ece4f5', '#c3b3e1', '#9c8cbd'], angle: 135 },
  { name: 'Tide', colors: ['#b7e7dd', '#76b9bc', '#5b88a3'], angle: 145 },
  { name: 'Terracotta', colors: ['#e7ba9e', '#c88573', '#8b5d62'], angle: 130 },
  { name: 'Blue hour', colors: ['#bed6ef', '#8cadd9', '#5c73af'], angle: 150 },
  { name: 'Citrus', colors: ['#f6ecba', '#e5d79b', '#bbc99a'], angle: 135 },
  { name: 'Plum', colors: ['#50344e', '#9b6a85', '#cf9b9a'], angle: 135 },
  { name: 'Cloud', colors: ['#eef0f1', '#dce1e7', '#c3c9d6'], angle: 140 },
  { name: 'Espresso', colors: ['#392f2e', '#6e5149', '#a5856e'], angle: 145 },
  { name: 'Petal', colors: ['#f3c7e4', '#dda9dd', '#b9a9de'], angle: 120 },
  { name: 'Moss', colors: ['#303d38', '#617362', '#a6ad89'], angle: 130 },
  { name: 'Porcelain', colors: ['#faf3eb', '#e8ddd3', '#d0c5c5'], angle: 135 },
  { name: 'Ember', colors: ['#6a3e48', '#ca7968', '#eda27e'], angle: 145 }
] as const

export const meshes = [
  {
    name: 'Bloom',
    css: 'radial-gradient(at 15% 20%, #c7abf8 0px, transparent 55%), radial-gradient(at 90% 10%, #f7c9d9 0px, transparent 55%), radial-gradient(at 70% 90%, #ffad8c 0px, transparent 60%), #e9c8e7'
  },
  {
    name: 'Aurora',
    css: 'radial-gradient(at 0% 0%, #30524c 0px, transparent 65%), radial-gradient(at 90% 10%, #a6c4aa 0px, transparent 55%), radial-gradient(at 50% 100%, #576c8c 0px, transparent 70%), #262b46'
  },
  {
    name: 'Silk',
    css: 'radial-gradient(at 10% 10%, #fff1e3 0px, transparent 65%), radial-gradient(at 90% 90%, #c8b1c6 0px, transparent 60%), radial-gradient(at 0% 100%, #ebbaa7 0px, transparent 60%), #e3d8d0'
  },
  {
    name: 'Orbit',
    css: 'radial-gradient(at 80% 0%, #5a4d92 0px, transparent 65%), radial-gradient(at 10% 100%, #224e67 0px, transparent 65%), #151723'
  }
] as const

export function gradientCSS(colors: readonly string[], angle: number) {
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`
}

export function backgroundCSS(style: StyleState): string {
  switch (style.background) {
    case 'transparent':
      return 'transparent'
    case 'solid':
      return style.backgroundColor
    case 'image':
      return style.image ? `url("${style.image}") center / cover` : style.backgroundColor
    case 'mesh':
      return meshes[style.mesh].css
    case 'gradient': {
      if (style.customGradient)
        return gradientCSS(
          [style.stop1, style.stop2, ...(style.threeStops ? [style.stop3] : [])],
          style.angle
        )
      const preset = gradients[style.gradient]
      return gradientCSS(preset.colors, preset.angle)
    }
  }
}

export const noBackdropStyle: StyleState = {
  ...defaultStyle,
  ...themes.dark,
  theme: 'dark',
  background: 'transparent',
  backgroundPadding: 0,
  shadow: 'none',
  border: true,
  borderColor: '#454353'
}

export const looks: { name: string; description: string; style: StyleState }[] = [
  {
    name: 'Bare',
    description: 'Midnight, minus the backdrop',
    style: noBackdropStyle
  },
  {
    name: 'Daydream',
    description: 'A softer kind of standout',
    style: defaultStyle
  },
  {
    name: 'Clean',
    description: 'Nothing but the good stuff',
    style: {
      ...defaultStyle,
      background: 'solid',
      backgroundColor: '#e9e9e7',
      radius: 12,
      shadow: 'soft'
    }
  },
  {
    name: 'Midnight',
    description: 'Made for the after hours',
    style: {
      ...defaultStyle,
      ...themes.dark,
      theme: 'dark',
      background: 'gradient',
      gradient: 6,
      border: true,
      borderColor: '#454353'
    }
  },
  {
    name: 'Sunset',
    description: 'A little warmth goes a long way',
    style: { ...defaultStyle, gradient: 2, radius: 24, shadow: 'strong' }
  },
  {
    name: 'Paper',
    description: 'The editorial treatment',
    style: {
      ...defaultStyle,
      background: 'solid',
      backgroundColor: '#e8e2d7',
      cardColor: '#fcfaf5',
      font: 'serif',
      radius: 3,
      grain: true,
      shadow: 'none',
      border: true,
      borderColor: '#d5d0c5'
    }
  },
  {
    name: 'Glass',
    description: 'Let the colors come through',
    style: {
      ...defaultStyle,
      background: 'mesh',
      glass: true,
      border: true,
      borderColor: '#ffffff',
      radius: 24
    }
  },
  {
    name: 'Brutalist',
    description: 'Straight to the point',
    style: {
      ...defaultStyle,
      background: 'solid',
      backgroundColor: '#d9e6c3',
      font: 'mono',
      fontSize: 20,
      radius: 0,
      shadow: 'none',
      border: true,
      borderColor: '#18181b',
      borderWidth: 3
    }
  }
]
