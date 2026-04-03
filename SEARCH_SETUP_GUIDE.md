# Global Search Setup Guide

## Quick Setup Instructions

### 1. Start your development server:
```bash
npm run dev
```

### 2. Login to your application

### 3. Test the search functionality:
- Click the search bar in the header
- Or press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- Type at least 2 characters to see results
- Try different entity types using the filter buttons

### 4. Test API endpoints directly:
```bash
# Get your JWT token from browser dev tools (Application > Cookies or Local Storage)
export JWT_TOKEN="your-jwt-token-here"

# Test basic search
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/api/search?q=test"

# Test filtered search
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/api/search?q=test&type=products"

# Test suggestions
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/api/search/suggestions?q=te"
```

## Features Available

✅ **Working Now:**
- Global search across all entities
- Real-time search with debouncing
- Type filtering (Products, Services, Clients, etc.)
- Keyboard shortcuts (Cmd+K / Ctrl+K)
- Mobile-responsive search interface
- Authentication and authorization
- Result navigation
- Smart suggestions based on existing data

## Searchable Entities

The search covers these entities with the following fields:

| Entity | Searchable Fields | Display Info |
|--------|------------------|--------------|
| Products | title, description, SKU | Title, price, SKU, images |
| Services | title, description | Title, price, images |
| Clients | fullName, email, phone | Name, email, phone, address |
| Sites | name, address, city, client | Name, address, client, status, progress |
| Workers | fullName, username, email | Name, role, email, phone |
| Orders | orderNumber, client | Order number, client, status, total |
| Offers | offerNumber, title, client | Offer number, title, client, status, total |
| Cars | name, number, model, color | Name, model, color, number, status |

## Keyboard Shortcuts

- `Cmd+K` or `Ctrl+K` - Open search modal
- `Escape` - Close search modal
- `Enter` - Perform search
- `Tab` - Navigate between filter buttons

## Troubleshooting

### Search not working?
1. Check that you're logged in
2. Verify the JWT token is valid
3. Check browser console for errors
4. Ensure minimum 2 characters in search query

### No results showing?
1. Verify data exists in your database
2. Check that entities have 'active' status where applicable
3. Try different search terms
4. Check user permissions for entity types

## Performance Notes

- Search results are limited to prevent performance issues
- Debounced input (300ms delay) reduces API calls
- Indexed database fields for fast queries
- Case-insensitive search using PostgreSQL ILIKE

## Security

- All endpoints require authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention via Prisma ORM

## Next Steps

After setup, you can:
1. Customize search result display
2. Add more searchable fields
3. Implement advanced filters
4. Add search result highlighting
5. Create search bookmarks
6. Export search results

For detailed implementation information, see `GLOBAL_SEARCH_IMPLEMENTATION.md`.