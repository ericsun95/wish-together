export const THEMES = ['clean', 'coast', 'city', 'garden', 'blush', 'lavender', 'peach', 'midnight'] as const;
export type Theme = typeof THEMES[number];
export const themeNames: Record<Theme, [string, string]> = {
  clean: ['奶油暖白', 'Warm cream'], coast: ['清晨海岸', 'Morning coast'],
  city: ['城市夜色', 'City evening'], garden: ['花园窗边', 'Garden window'],
  blush: ['樱花心动', 'Cherry blossom'], lavender: ['薰衣草梦', 'Lavender dream'],
  peach: ['落日蜜桃', 'Peach sunset'], midnight: ['星夜私语', 'Midnight whispers'],
};
export function themeBackground(theme: string, basePath = '') {
  if (['coast', 'city', 'garden'].includes(theme)) return `url("${basePath}/themes/${theme}.webp")`;
  const gradients: Record<string, string> = {
    blush: 'linear-gradient(135deg, #f9c5d5, #ffe9de 55%, #eed1e7)',
    lavender: 'linear-gradient(135deg, #c7b9eb, #ece4fc 55%, #d3def4)',
    peach: 'linear-gradient(135deg, #f5af91, #ffe1af 55%, #f8c5bc)',
    midnight: 'linear-gradient(135deg, #10182e, #293455 55%, #554368)',
  };
  return gradients[theme] || 'none';
}
