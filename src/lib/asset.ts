/** Ссылка на файл из public/ с учётом base — работает и из подпапки. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
