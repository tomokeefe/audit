import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F57f3921c477141799725b87f2761d2c2%2Ff2dd7552d6e3445893146adbf2af6d10?format=webp&width=800"
              alt="Brand Whisperer Logo"
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
              style={{ marginLeft: "-1px" }}
            >
              Dashboard
            </Link>
            <Link
              to="/audits"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Audits
            </Link>
            <Link
              to="/compare"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Compare
            </Link>
            <Link
              to="/reports"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              style={{ marginLeft: "30px" }}
            >
              Reports
            </Link>
          </nav>

          {/* User section */}
          <div className="flex items-center space-x-4" />
        </div>
      </div>
    </header>
  );
}
