code = '''/* eslint-disable react/prop-types */
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { saveLastClickedPoster } from "../../../utils/focusManager";

import "./index.scss";

import ContentWrapper from "../../../components/content-wrapper";
import Img from "../../../components/lazy-load";
import avatar from "../../../assets/avatar.png";

const Cast = ({ data, loading }) => {
	const { url } = useSelector((state) => state.home);
	const navigate = useNavigate();

	const skeleton = () => {
		return (
			<div className="skItem">
				<div className="circle skeleton"></div>
				<div className="row skeleton"></div>
				<div className="row2 skeleton"></div>
			</div>
		);
	};
	return (
		<div className="castSection">
			<ContentWrapper>
				<div className="sectionHeading">Top Cast</div>
				{!loading ? (
					<div className="listItems">
						{data?.map((item) => {
							const profileBase = url?.profile || "https://image.tmdb.org/t/p/original";
							const avatarUrl = item.profile_path
								? profileBase + item.profile_path
								: avatar;
							return (
								<div 
									key={item.id} 
									id={poster-person-}
									className="listItem"
									tabIndex="0"
									role="button"
									onClick={() => {
										saveLastClickedPoster(item.id, "person");
										navigate(/person/);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
											e.preventDefault();
											saveLastClickedPoster(item.id, "person");
											navigate(/person/);
										}
									}}
								>
									<div className="profileImg">
										<Img src={avatarUrl} />
									</div>
									<div className="name">{item.name}</div>
									<div className="character">
										{item.character}
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="castSkeleton">
						{skeleton()}
						{skeleton()}
						{skeleton()}
						{skeleton()}
						{skeleton()}
						{skeleton()}
					</div>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Cast;
'''

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Restored cast-section/index.jsx")
