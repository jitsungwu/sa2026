import '../styles/globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Next.js + Firebase Scaffold',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Providers>
          <div className="site">
            <header className="site-header">
              <div className="container" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <a href="/" className="brand">ClassCue</a>
                <nav className="nav"></nav>
              </div>
            </header>

            <main className="container site-content">{children}</main>

            <footer className="site-footer">
              <div className="container">© 2026 ClassCue. All rights reserved.</div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  )
}