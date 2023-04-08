import "./globals.css";

export const metadata = {
	title: "media-dl",
	description: "Download videos or just their audio",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="bg-gray-200">
			<body>{children}</body>
		</html>
	);
}
