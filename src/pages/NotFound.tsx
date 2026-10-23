import { ErrorScene } from '../components/ErrorScene'

export default function NotFound() {
  return (
    <ErrorScene
      title="404 - Page Not Found"
      subtitle="The page you requested does not exist or has been moved."
    >
      <a href="/" className="error-btn error-btn-primary">
        Return to Base
      </a>
      <a href="/notable-accidents/" className="error-btn">
        Browse Accidents
      </a>
    </ErrorScene>
  )
}
