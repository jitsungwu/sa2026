import '../../../styles/globals.css'

export const metadata = {
  title: 'Next.js + Firebase',
  description: 'Demo project with Firestore',
}

// Nested layouts must not render <html> or <body> elements.
// The root `src/app/layout.jsx` already provides the document
// shell. Return a fragment containing the children instead.
export default function TestListLayout({ children }) {
  return <>{children}</>
}