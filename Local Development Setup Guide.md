Local Development Setup Guide (Tailwind v4)Follow these steps to move your "Angler's Log" from Canvas to your local machine using the latest web standards.
1. Initialize the ProjectWe recommend using Vite for a fast, modern React setup. Open your terminal and run:
# Create the project
```
npm create vite@latest anglers-log -- --template react
```
# Enter the directory
```
cd anglers-log
```

# Install initial dependencies
```
npm install
```
2. Install Project DependenciesYour app relies on Tailwind CSS v4, Lucide for icons, and Chart.js for reports. Run these commands:# Install UI and Charting libraries
```
npm install lucide-react chart.js react-chartjs-2
```

# Install Tailwind CSS v4 and the PostCSS engine
```
npm install -D tailwindcss @tailwindcss/postcss postcss autoprefixer
```
3. Configure Tailwind v4 & PostCSSTailwind v4 uses a simplified configuration. Create these two files in your root directory:File 1: 
```
postcss.config.jsexport default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },

}
```
File 2: tailwind.config.js
```
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```
4. Setup Global CSS
Open ./src/index.css, delete all existing content, and replace it with the new v4 import:
```
@import "tailwindcss";
```
5. Finalize React Entry
Ensure your src/main.jsx is importing the CSS. It should look like this:
```
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```
6. Move the Code & RunCopy the entire contents of your App.jsx from Canvas.Replace everything in your local src/App.jsx with that code.Start the app:
```
npm run dev
```
7. Initialize Gitgit init

```
git add .
git commit -m "Initial commit: Angler's Log React Migration with Tailwind v4"

git remote add origin [https://github.com/shijiema/anglers-log.git](https://github.com/shijiema/anglers-log.git)

# Push the code
git push -u origin main
```

8. Deployment (Optional)

Once your code is on GitHub, you can connect your repository to Vercel or Netlify. They will automatically detect the Vite setup and provide you with a live URL to open on your iPhone!