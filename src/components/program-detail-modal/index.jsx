import React from "react";
import { FiTv, FiClock, FiCalendar, FiPlay, FiVideo, FiX, FiInfo } from "react-icons/fi";
import "./index.scss";

const ProgramDetailModal = ({ show, onClose, program, channel, onPlay, onRecord }) => {
  if (!show || !program) return null;

  const title = program.title || program.name || "Live Program";
  const desc = program.description || program.summary || "No program description available.";
  const channelName = channel?.name || program.channel_name || "Live Channel";
  const channelNum = channel?.number || program.channel_number || "";
  const channelLogo = channel?.logo || program.channel_logo || "";

  const startDate = program.start_time ? new Date(program.start_time) : null;
  const endDate = program.end_time ? new Date(program.end_time) : null;

  const timeRange = startDate && endDate
    ? `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : "Live Broadcast";

  const dateStr = startDate
    ? startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : "";

  // Duration in minutes
  const durationMins = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))
    : 0;

  // Season & Episode tag
  const seasonEpStr = program.season && program.episode
    ? `S${String(program.season).padStart(2, '0')} E${String(program.episode).padStart(2, '0')}`
    : (program.episode_title ? program.episode_title : null);

  const isCurrentlyLive = startDate && endDate && new Date() >= startDate && new Date() <= endDate;

  return (
    <div className="programDetailModalOverlay" onClick={onClose}>
      <div className="programDetailModalContent" onClick={(e) => e.stopPropagation()} tabIndex="0">
        <button className="closeBtn" onClick={onClose} tabIndex="0">
          <FiX />
        </button>

        <div className="modalHeader">
          {channelLogo ? (
            <img src={channelLogo} alt={channelName} className="chLogo" />
          ) : (
            <div className="chPlaceholder">{channelName.substring(0, 3)}</div>
          )}
          <div className="chMeta">
            <h2>{title}</h2>
            <div className="subMeta">
              <span className="chName">{channelNum ? `Ch ${channelNum} — ` : ""}{channelName}</span>
              {isCurrentlyLive && <span className="liveBadge">LIVE NOW</span>}
              {seasonEpStr && <span className="seasonBadge">{seasonEpStr}</span>}
            </div>
          </div>
        </div>

        <div className="modalBody">
          <div className="timeInfoBar">
            <div className="infoItem">
              <FiClock className="icon" />
              <span>{timeRange} {durationMins > 0 ? `(${durationMins} mins)` : ""}</span>
            </div>
            {dateStr && (
              <div className="infoItem">
                <FiCalendar className="icon" />
                <span>{dateStr}</span>
              </div>
            )}
          </div>

          <div className="descriptionBox">
            <h3><FiInfo style={{ marginRight: '6px' }} /> Synopsis</h3>
            <p>{desc}</p>
          </div>

          {program.category && (
            <div className="genreTag">
              <span>Category: <strong>{program.category}</strong></span>
            </div>
          )}
        </div>

        <div className="modalFooter">
          <button className="cancelBtn" onClick={onClose} tabIndex="0">
            Close
          </button>
          <button
            className="recordBtn"
            onClick={() => { onClose(); onRecord(program, channel); }}
            tabIndex="0"
          >
            <FiVideo /> Schedule DVR Recording
          </button>
          <button
            className="playBtn"
            onClick={() => { onClose(); onPlay(channel); }}
            tabIndex="0"
          >
            <FiPlay /> Watch Channel Live
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgramDetailModal;
