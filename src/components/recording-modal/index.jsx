import { useState } from "react";
import { FiVideo, FiClock, FiCalendar, FiRepeat, FiCheck, FiX } from "react-icons/fi";
import "./index.scss";

const RecordingModal = ({ show, onClose, program, channel, onConfirm }) => {
  if (!show || (!program && !channel)) return null;

  const [ruleType, setRuleType] = useState("one_time"); // "one_time", "recurring_slot", "series"
  const [selectedDays, setSelectedDays] = useState(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const [paddingBefore, setPaddingBefore] = useState(0); // Minutes
  const [paddingAfter, setPaddingAfter] = useState(5); // Minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  const programTitle = program?.title || program?.name || channel?.now_playing || "Live Program";
  const channelName = channel?.name || program?.channel_name || "Live Channel";
  const channelId = channel?.id || program?.channel_id || program?.channel;

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== day));
      }
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const payload = {
      type: ruleType,
      title: programTitle,
      name: programTitle,
      program_name: programTitle,
      channel: channelId,
      channel_id: channelId,
      start_time: program?.start_time || new Date().toISOString(),
      end_time: program?.end_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      days_of_week: ruleType === "recurring_slot" ? selectedDays : [],
      padding_before: paddingBefore,
      padding_after: paddingAfter,
      custom_properties: {
        title: programTitle,
        channel_name: channelName,
        rule_type: ruleType
      }
    };

    await onConfirm(payload);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="recordingModalOverlay" onClick={onClose}>
      <div className="recordingModalContent" onClick={(e) => e.stopPropagation()} tabIndex="0">
        <button className="closeBtn" onClick={onClose} tabIndex="0">
          <FiX />
        </button>

        <div className="modalHeader">
          <FiVideo className="headerIcon" />
          <div>
            <h2>Schedule DVR Recording</h2>
            <p className="subTitle">{programTitle} — <span className="chHighlight">{channelName}</span></p>
          </div>
        </div>

        <div className="modalBody">
          {/* Recording Mode Selection */}
          <div className="formGroup">
            <label className="sectionLabel">Recording Type:</label>
            <div className="ruleTypeOptions">
              <label
                className={`typeCard ${ruleType === "one_time" ? "selected" : ""}`}
                onClick={() => setRuleType("one_time")}
              >
                <div className="radioIcon">
                  <FiClock />
                </div>
                <div className="cardText">
                  <span className="cardTitle">⚡ One-time Broadcast</span>
                  <span className="cardDesc">Record only this single upcoming broadcast episode.</span>
                </div>
              </label>

              <label
                className={`typeCard ${ruleType === "recurring_slot" ? "selected" : ""}`}
                onClick={() => setRuleType("recurring_slot")}
              >
                <div className="radioIcon">
                  <FiRepeat />
                </div>
                <div className="cardText">
                  <span className="cardTitle">🔁 Recurring Time Slot</span>
                  <span className="cardDesc">Record every broadcast at this time slot on this channel.</span>
                </div>
              </label>

              <label
                className={`typeCard ${ruleType === "series" ? "selected" : ""}`}
                onClick={() => setRuleType("series")}
              >
                <div className="radioIcon">
                  <FiCalendar />
                </div>
                <div className="cardText">
                  <span className="cardTitle">📺 Recurring Series Rule</span>
                  <span className="cardDesc">Record all new episodes of "{programTitle}" across any channel.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Days of Week (for Recurring Time Slot) */}
          {ruleType === "recurring_slot" && (
            <div className="formGroup">
              <label className="sectionLabel">Active Days of Week:</label>
              <div className="daysSelector">
                {[
                  { id: "mon", label: "M" },
                  { id: "tue", label: "T" },
                  { id: "wed", label: "W" },
                  { id: "thu", label: "T" },
                  { id: "fri", label: "F" },
                  { id: "sat", label: "S" },
                  { id: "sun", label: "S" }
                ].map((d) => (
                  <button
                    key={d.id}
                    className={`dayBtn ${selectedDays.includes(d.id) ? "active" : ""}`}
                    onClick={() => toggleDay(d.id)}
                    type="button"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Padding Controls */}
          <div className="formRow">
            <div className="formGroup flex1">
              <label className="sectionLabel">Start Early:</label>
              <select value={paddingBefore} onChange={(e) => setPaddingBefore(Number(e.target.value))}>
                <option value={0}>Exact Time (0 min)</option>
                <option value={2}>2 Minutes Early</option>
                <option value={5}>5 Minutes Early</option>
              </select>
            </div>

            <div className="formGroup flex1">
              <label className="sectionLabel">End Late:</label>
              <select value={paddingAfter} onChange={(e) => setPaddingAfter(Number(e.target.value))}>
                <option value={0}>Exact Time (0 min)</option>
                <option value={5}>5 Minutes Late</option>
                <option value={15}>15 Minutes Late</option>
                <option value={30}>30 Minutes Late</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modalFooter">
          <button className="cancelBtn" onClick={onClose} tabIndex="0">
            Cancel
          </button>
          <button className="confirmBtn" onClick={handleConfirm} disabled={isSubmitting} tabIndex="0">
            <FiCheck /> {isSubmitting ? "Scheduling..." : "Confirm Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordingModal;
