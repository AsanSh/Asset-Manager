// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.json({ status: 'ok', message: 'API is running' });
}
