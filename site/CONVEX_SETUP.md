# Convex Setup for Bitsy

## What is Convex?

Convex is a backend-as-a-service for Next.js apps. It gives us:
- ✓ Type-safe database (no SQL needed)
- ✓ Real-time queries
- ✓ Serverless functions
- ✓ Built-in security
- ✓ Local development

## Setup Steps

### 1. Create Convex Account

Go to [convex.dev](https://convex.dev) and sign up.

### 2. Deploy Convex

```bash
cd /path/to/bitsy/site
npx convex deploy
```

This will:
- Ask you to log in
- Create a Convex project
- Deploy your schema and functions

### 3. Add Environment Variables

After deploying, you'll get a `CONVEX_DEPLOYMENT` URL. Add to `.env.local`:

```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 4. Install Convex Client

```bash
npm install convex next-convex
```

### 5. Configure Next.js

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["convex"],
  },
};

module.exports = nextConfig;
```

### 6. Wrap Your App with ConvexProvider

Update `src/app/layout.tsx`:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
```

## Project Structure

```
convex/
├── schema.ts           # Database schema (tables + indexes)
├── mentions.ts         # Functions for mention records
├── signals.ts          # Functions for brand signals
├── logs.ts             # Functions for pipeline logs
└── _generated/         # Auto-generated (don't edit)
    ├── api.d.ts
    └── server.d.ts
```

## Tables

### mention_records
Stores LLM API call results:
```json
{
  "date": "2025-04-05",
  "brand": "Zapier",
  "model": "claude-3.5-sonnet",
  "query_id": "query_001",
  "mentioned": true,
  "mention_rate": 52.0
}
```

### brand_signals
Stores daily brand metrics:
```json
{
  "date": "2025-04-05",
  "brand": "Zapier",
  "freshness_days": 2,
  "authority_count": 5,
  "domain_authority": 85.0,
  "num_queries": 41,
  "market_share": 0.266,
  "content_age_days": 32,
  "competitor_rank": 1,
  "schema_markup_score": 0.625
}
```

### pipeline_logs
Stores logs from each step:
```json
{
  "timestamp": "14:23:45",
  "step": "1B",
  "message": "API calls: 25/100",
  "status": "pending",
  "data": { ... }
}
```

## Using in Frontend

```tsx
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function MyComponent() {
  // Call a mutation
  const storeMention = useMutation(api.mentions.storeMentionRecord);
  
  // Query data
  const mentions = useQuery(api.mentions.getMentionsByDate, {
    date: "2025-04-05",
  });

  return (
    <div>
      {mentions?.map((mention) => (
        <div key={mention._id}>{mention.brand}</div>
      ))}
    </div>
  );
}
```

## Deployment

### Local Development

```bash
npx convex dev
```

This starts:
- Local Convex backend on `http://localhost:3210`
- Hot reload for schema changes

### Production

```bash
npx convex deploy
```

This deploys to your Convex cloud project.

## Documentation

- [Convex Docs](https://docs.convex.dev)
- [TypeScript Guide](https://docs.convex.dev/typescript)
- [React Integration](https://docs.convex.dev/client/react)

## Next Steps

Once deployed, you're ready to:
1. **Step 1**: Collect real LLM data + signals
2. **Step 2**: Train the model
3. **Step 3**: Cache predictions
4. **Step 4**: User interface
5. **Step 5**: Predictions

All data will be stored in Convex!
