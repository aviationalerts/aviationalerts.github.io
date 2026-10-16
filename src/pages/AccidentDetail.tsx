import { ArrowLeft, Plane, MapPin, Calendar, Users, BookOpen, AlertTriangle } from 'lucide-react'
import { ACCIDENTS } from '../data/accidents'

export default function AccidentDetail({ id }: { id: string }) {
  const accident = ACCIDENTS.find((a) => a.id === id)

  if (!accident) {
    return (
      <div className="pilots-page">
        <header className="pilots-header">
          <a href="/notable-accidents" className="pilots-back">
            <ArrowLeft size={14} />
            <span>Back to Accidents</span>
          </a>
          <div className="pilots-title-block">
            <p className="pilots-kicker">// 404</p>
            <h1 className="pilots-h1">Accident Not Found</h1>
            <p className="pilots-lede">This accident report doesn't exist.</p>
          </div>
        </header>
      </div>
    )
  }

  return (
    <div className="pilots-page">
      <header className="pilots-header">
        <a href="/notable-accidents" className="pilots-back">
          <ArrowLeft size={14} />
          <span>Back to Accidents</span>
        </a>
        <div className="pilots-title-block">
          <p className="pilots-kicker">// {accident.significance}</p>
          <h1 className="pilots-h1">{accident.flight}</h1>
          <p className="pilots-lede">{accident.summary}</p>
        </div>
      </header>

      <div className="accident-detail">
        <div className="accident-detail-facts">
          <div className="accident-fact">
            <Calendar size={16} />
            <div>
              <span className="accident-fact-label">Date</span>
              <span className="accident-fact-value">{accident.date}</span>
            </div>
          </div>
          <div className="accident-fact">
            <Plane size={16} />
            <div>
              <span className="accident-fact-label">Aircraft</span>
              <span className="accident-fact-value">{accident.aircraft}</span>
            </div>
          </div>
          <div className="accident-fact">
            <MapPin size={16} />
            <div>
              <span className="accident-fact-label">Location</span>
              <span className="accident-fact-value">{accident.location}</span>
            </div>
          </div>
          <div className="accident-fact">
            <Users size={16} />
            <div>
              <span className="accident-fact-label">Fatalities</span>
              <span className="accident-fact-value">{accident.fatalities}</span>
            </div>
          </div>
          {accident.survivors && (
            <div className="accident-fact">
              <Users size={16} />
              <div>
                <span className="accident-fact-label">Survivors</span>
                <span className="accident-fact-value">{accident.survivors}</span>
              </div>
            </div>
          )}
          <div className="accident-fact">
            <AlertTriangle size={16} />
            <div>
              <span className="accident-fact-label">Cause</span>
              <span className="accident-fact-value">{accident.cause}</span>
            </div>
          </div>
        </div>

        <div className="accident-detail-body">
          <div className="accident-detail-section">
            <h2 className="accident-detail-h2">What Happened</h2>
            <p className="accident-detail-text">{accident.detail}</p>
          </div>

          <div className="accident-detail-section accident-lesson-box">
            <h2 className="accident-detail-h2">
              <BookOpen size={18} />
              <span>The Lesson</span>
            </h2>
            <p className="accident-detail-text">{accident.lesson}</p>
          </div>

          <div className="accident-detail-tags">
            {accident.tags.map((t) => (
              <span key={t} className="pilot-tag">{t}</span>
            ))}
          </div>
        </div>
      </div>

      <footer className="pilots-footer">
        <span>Aviation Alerts</span>
      </footer>
    </div>
  )
}
