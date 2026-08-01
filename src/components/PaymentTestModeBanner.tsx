const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("test_")) return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      All payments made in this preview go through Paddle's sandbox — real card numbers (like{" "}
      <code className="font-mono bg-orange-200 px-1 rounded">4242 4242 4242 4242</code>) will not
      work here.{" "}
      <a
        href="https://developer.paddle.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        See Paddle's sandbox test card docs
      </a>
    </div>
  );
}
