import { db } from '../../../../firebaseClient'
import { doc, deleteDoc } from 'firebase/firestore'

/**
 * POST /api/test/cleanup-layout
 * Clears the layout document for a given class (used for testing only)
 * 
 * Request body:
 * { classId: "demo" }
 * 
 * Response:
 * { success: true, message: "Layout cleared" }
 */
export async function POST(request) {
  try {
    // Safety check: only allow in development or with specific flag
    if (process.env.NODE_ENV === 'production') {
      return Response.json(
        { success: false, error: 'Test cleanup not allowed in production' },
        { status: 403 }
      )
    }

    const { classId } = await request.json()

    if (!classId) {
      return Response.json(
        { success: false, error: 'classId required' },
        { status: 400 }
      )
    }

    const layoutDocRef = doc(db, `classes/${classId}/layout`, 'grid')
    
    try {
      await deleteDoc(layoutDocRef)
    } catch (e) {
      // Document might not exist, that's ok
      if (!e.message.includes('not-found')) {
        throw e
      }
    }

    return Response.json({
      success: true,
      message: 'Layout cleared'
    })
  } catch (error) {
    console.error('Cleanup layout error:', error)
    return Response.json(
      { success: false, error: error.message || 'cleanup failed' },
      { status: 500 }
    )
  }
}
