import "./index.scss";
import ContentWrapper from "../content-wrapper";

const Footer = () => {
  return (
    <footer className="footer">
      <ContentWrapper>
        <div className="infoText">
          © {new Date().getFullYear()} BubbaFlix. All rights reserved.
        </div>
      </ContentWrapper>
    </footer>
  );
};

export default Footer;
