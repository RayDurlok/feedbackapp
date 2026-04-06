import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		outDir: path.resolve(__dirname, 'js'),
		emptyOutDir: false,
		rollupOptions: {
			input: {
				'feedbackapp-init': path.resolve(__dirname, 'src/files/init.js'),
				'feedbackapp-filesPlugin': path.resolve(__dirname, 'src/files/filesPlugin.js'),
				'feedbackapp-timestampCommentsTab': path.resolve(__dirname, 'src/timestampCommentsTab.js'),
				'feedbackapp-publicShare': path.resolve(__dirname, 'src/publicShare.js'),
			},
			output: {
				format: 'es',
				entryFileNames: '[name].mjs',
				chunkFileNames: '[name]-[hash].chunk.mjs',
				assetFileNames: '[name]-[hash][extname]',
			},
		},
	},
})
