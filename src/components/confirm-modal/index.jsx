/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiLogOut } from "react-icons/fi";
import "./index.scss";

const ConfirmModal = ({
	show,
	setShow,
	title = "Sign Out",
	message = "Are you sure you want to sign out?",
	confirmText = "Sign Out",
	cancelText = "Cancel",
	onConfirm
}) => {
	const modalRef = useRef(null);

	useEffect(() => {
		if (show && modalRef.current) {
			setTimeout(() => {
				const cancelBtn = modalRef.current.querySelector(".cancelBtn");
				if (cancelBtn) cancelBtn.focus();
			}, 100);
		}
	}, [show]);

	if (!show) return null;

	const handleConfirm = () => {
		setShow(false);
		if (typeof onConfirm === "function") {
			onConfirm();
		}
	};

	const handleCancel = () => {
		setShow(false);
	};

	const handleKeyDown = (e) => {
		const code = e.keyCode;
		if (e.key === "Escape" || e.key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
			e.preventDefault();
			e.stopPropagation();
			handleCancel();
		}
	};

	return createPortal(
		<div className={`confirmModalOverlay ${show ? "visible" : ""}`} ref={modalRef} onKeyDown={handleKeyDown}>
			<div className="opacityLayer" onClick={handleCancel}></div>
			<div className="confirmModalCard">
				<div className="modalHeader">
					<FiLogOut className="modalIcon" />
					<h3>{title}</h3>
				</div>
				<p className="modalMessage">{message}</p>
				<div className="modalActions">
					<button
						className="confirmBtn cancelBtn"
						tabIndex="0"
						onClick={handleCancel}
						onKeyDown={(e) => {
							const code = e.keyCode;
							if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
								e.preventDefault();
								handleCancel();
							}
						}}
					>
						{cancelText}
					</button>
					<button
						className="confirmBtn actionBtn"
						tabIndex="0"
						onClick={handleConfirm}
						onKeyDown={(e) => {
							const code = e.keyCode;
							if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
								e.preventDefault();
								handleConfirm();
							}
						}}
					>
						{confirmText}
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};

export default ConfirmModal;
