import '../styles/globals.css'

export const metadata = {
  title: 'Next.js + Firebase Scaffold',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  )
}