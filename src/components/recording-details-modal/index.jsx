import React from "react";
import { FiVideo, FiClock, FiCalendar, FiPlay, FiTrash2, FiX, FiArrowLeft, FiInfo, FiScissors, FiPlusCircle } from "react-icons/fi";
import "./index.scss";

const RecordingDetailsModal = ({ show, onClose, recording, onPlay, onDelete }) => {
  if (!show || !recording) return null;

  const customProps = recording.custom_properties || {};
  const program = customProps.program || {};

  const title = recording.title || program.title || customProps.title || recording.name || "DVR Recording";
  const subTitle = program.sub_title || recording.sub_title || recording.episode_title || "";
  const desc = recording.description || program.description || customProps.description || "No description available.";

  const channelName = recording.channel_display || recording.channel_name || customProps.channel_name || "TV Channel";
  const channelLogo = recording.thumbnail || customProps.poster_url || "";

  const startDate = recording.start_time ? new Date(recording.start_time) : null;
  const endDate = recording.end_time ? new Date(recording.end_time) : null;

  const timeRange = startDate && endDate
    ? `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : recording.formatted_date || "Recorded Broadcast";

  const dateStr = startDate
    ? startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : "";

  const durationMins = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    : (recording.duration ? recording.duration : 0);

  const season = recording.season ?? customProps.season ?? program.season;
  const episode = recording.episode ?? customProps.episode ?? program.episode;
  const seasonEpStr = season && episode
    ? `S${String(season).padStart(2, '0')} E${String(episode).padStart(2, '0')}`
    : (subTitle || null);

  const status = customProps.status || (recording.is_recurring ? "Recurring Rule" : "Completed");
  const comskipStatus = customProps.comskip?.status || "Not processed";

  return (
    <div className="recordingDetailsModalOverlay" onClick={onClose}>
      <div className="recordingDetailsModalContent" onClick={(e) => e.stopPropagation()} tabIndex="0">
        <button className="backBtn" onClick={onClose} tabIndex="0" aria-label="Go Back" title="Go Back">
          <FiArrowLeft />
        </button>
        <button className="closeBtn" onClick={onClose} tabIndex="0">
          <FiX />
        </button>

        <div className="modalHeader">
          {channelLogo ? (
            <img src={channelLogo} alt={title} className="recPoster" />
          ) : (
            <div className="recPlaceholder"><FiVideo /></div>
          )}
          <div className="recHeaderMeta">
            <span className={`statusBadge ${recording.is_recurring ? "recurring" : "completed"}`}>
              {recording.rule_badge || status}
            </span>
            <h2>{title}</h2>
            {subTitle && <h4 className="subTitle">{subTitle}</h4>}
            <div className="subMeta">
              <span className="chName">{channelName}</span>
              {seasonEpStr && <span className="seasonBadge">{seasonEpStr}</span>}
            </div>
          </div>
        </div>

        <div className="modalBody">
          <div className="timeInfoGrid">
            <div className="infoItem">
              <FiClock className="icon" />
              <div>
                <span className="infoLabel">Broadcast Time</span>
                <span className="infoVal">{timeRange} {durationMins > 0 ? `(${durationMins} mins)` : ""}</span>
              </div>
            </div>

            {dateStr && (
              <div className="infoItem">
                <FiCalendar className="icon" />
                <div>
                  <span className="infoLabel">Air Date</span>
                  <span className="infoVal">{dateStr}</span>
                </div>
              </div>
            )}

            <div className="infoItem">
              <FiScissors className="icon" />
              <div>
                <span className="infoLabel">Commercial Skip (Comskip)</span>
                <span className="infoVal">{comskipStatus}</span>
              </div>
            </div>
          </div>

          <div className="descriptionBox">
            <h3><FiInfo style={{ marginRight: '6px' }} /> Plot Synopsis & Details</h3>
            <p>{desc}</p>
          </div>
        </div>

        <div className="modalFooter">
          <button className="deleteBtn" onClick={() => { onClose(); onDelete(recording.id); }} tabIndex="0">
            <FiTrash2 /> Delete Recording
          </button>
          <div className="rightBtns">
            <button className="cancelBtn" onClick={onClose} tabIndex="0">
              Close
            </button>
            <button className="playBtn" onClick={() => { onClose(); onPlay(recording); }} tabIndex="0">
              <FiPlay /> Watch Recording
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingDetailsModal;
