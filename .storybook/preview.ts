import type { Preview } from '@storybook/nextjs-vite'
import { a11yAddon } from '@storybook/addon-a11y/preview'

const preview: Preview = {
  addons: [a11yAddon()],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {name: 'dark', value: '#0a0a0a' },
        { name: 'zinc-900', value: '#19191b' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="font-sans text-zinc-200 antialiased">
        <Story />
      </div>
    ),
  ],
};

export default preview;