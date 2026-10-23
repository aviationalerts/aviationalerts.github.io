import { ErrorScene } from '../components/ErrorScene'

export default function Forbidden() {
  return (
    <ErrorScene title="403 - Forbidden" subtitle="Access to this page is forbidden." />
  )
}
