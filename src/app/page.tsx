"use client";

import { useState } from "react";

export default function Home() {
	const [option, setOption] = useState("video");
	const [downloadUrl, setDownloadUrl] = useState("");
	const [progress, setProgress] = useState(0);
	const [downloadError, setDownloadError] = useState(false);
	const [downloadErrorMessage, setDownloadErrorMessage] = useState("");
	const MEDIA_DL_API_URL = "/api";

	function calculateProgress(done: number, total: number) {
		if (total === 0) {
			return 0.0;
		}
		return done / total;
	}

	async function downloadFile(task_id: string) {
		var filename = "";
		await fetch(`${MEDIA_DL_API_URL}/task/${task_id}/file`)
			.then((response) => {
				if (response.status !== 200) {
					return;
				}

				const disposition = response.headers.get("Content-Disposition");
				filename = disposition!.split(/;(.+)/)[1].split(/=(.+)/)[1];
				if (filename.toLowerCase().startsWith("utf-8''"))
					filename = decodeURIComponent(
						filename.replace("utf-8''", "")
					);
				else filename = filename.replace(/['"]/g, "");

				return response.blob();
			})
			.then((blob) => {
				var url = window.URL.createObjectURL(blob!);
				var a = document.createElement("a");
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				a.remove();
			});
	}

	async function onSubmit(e: any) {
		// Prevent redirect
		e.preventDefault();

		// Reset error states
		setDownloadError(false);
		setDownloadErrorMessage("");

		// Request download task on server
		var exit = false;
		var task_id = "0";
		await fetch(`${MEDIA_DL_API_URL}/download/${option}/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			mode: "cors",
			body: JSON.stringify({
				url: downloadUrl,
			}),
		})
			.then((res) => {
				if (res.status == 422) {
					setDownloadError(true);
					setDownloadErrorMessage(
						"The specified link is invalid. Please provide a valid url."
					);
					exit = true;
				}

				return res.json();
			})
			.then((json) => {
				// Get task id
				task_id = json.id;
			});
		if (exit) {
			return;
		}

		// Begin polling (get download progress every x seconds)
		const pollEveryMilliseconds = 200;
		var intervalId = setInterval(() => {
			fetch(`${MEDIA_DL_API_URL}/task/${task_id}/status/`)
				.then((res) => res.json())
				.then((res) => {
					// Update progress
					setProgress(calculateProgress(res.done, res.total));

					// Stop polling if task failed
					if (res.status == "FAILURE") {
						clearInterval(intervalId);
						setDownloadError(true);
						setDownloadErrorMessage(
							"Video could not be downloaded. Please double check the provided link."
						);
					}

					// Stop polling ended successfully
					if (res.status === "SUCCESS") {
						clearInterval(intervalId);
						downloadFile(task_id);
					}
				});
		}, pollEveryMilliseconds);
	}

	function handleOptionChange(e: any) {
		setOption(e.target.value);
	}

	function handleDownloadUrlChange(e: any) {
		setDownloadUrl(e.target.value);
	}

	function formatBytes(bytes: number, decimals = 2) {
		if (!+bytes) return "0 Bytes";
		const k = 1000;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${
			sizes[i]
		}`;
	}

	return (
		<div className="flex flex-col items-center justify-center w-screen h-screen">
			<div className="container w-full max-w-2xl p-4">
				<form className="form-control">
					<div className="flex flex-col">
						<div className="flex flex-col items-center sm:flex-row sm:input-group">
							<input
								type="search"
								placeholder="https://www.youtube.com/watch?v=…"
								className="w-full input input-bordered"
								onChange={handleDownloadUrlChange}
							/>
							<select
								name="option"
								className="w-full mt-3 sm:w-auto sm:mt-0 select select-bordered"
								onChange={(e) => handleOptionChange(e)}
							>
								<option value="video">Video</option>
								<option value="audio">Audio</option>
							</select>
						</div>
						<div className="flex items-center h-16 mt-5">
							{downloadError && (
								<div className="text-sm alert alert-error">
									<div>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="flex-shrink-0 w-6 h-6 stroke-current"
											fill="none"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<span>{downloadErrorMessage}</span>
									</div>
								</div>
							)}
						</div>
						<div className="flex items-center mt-3">
							<progress
								className={
									"progress progress-accent " +
									(downloadError && " progress-error")
								}
								value={downloadError ? 1 : progress}
								max="1"
							></progress>
						</div>
						<button
							className="gap-2 mt-3 btn btn-primary"
							onClick={onSubmit}
							type="submit"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="w-6 h-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
								/>
							</svg>
							Download
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
