# MongoDB Connection Troubleshooting

## Error: "connection to 159.41.207.93:27017 closed"

This error indicates that your application cannot connect to MongoDB Atlas. Here are the solutions:

---

## Solution 1: Whitelist Your IP Address (Most Common) ✅

MongoDB Atlas requires you to whitelist IP addresses that can connect to your cluster.

### Steps:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Log in to your account
3. Select your project
4. Click on "Network Access" in the left sidebar
5. Click "Add IP Address"
6. Choose one of these options:
   - **Add Current IP Address** (for your current location)
   - **Allow Access from Anywhere** (0.0.0.0/0) - for development only
7. Click "Confirm"
8. Wait 1-2 minutes for the changes to propagate
9. Restart your Next.js dev server

### For Development (Recommended):
```
IP Address: 0.0.0.0/0
Description: Allow all (development only)
```

⚠️ **Security Note**: For production, use specific IP addresses or CIDR blocks.

---

## Solution 2: Check MongoDB Cluster Status

Your cluster might be paused or unavailable.

### Steps:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click on "Database" in the left sidebar
3. Check if your cluster shows "Paused" or "Unavailable"
4. If paused, click "Resume" button
5. Wait for cluster to become active (green status)

---

## Solution 3: Verify Connection String

Make sure your MongoDB URI is correct.

### Current Connection String:
```
mongodb+srv://jamdadeabhishek039:R1RKwuYdIpBaxPck@cluster0.uqicqbb.mongodb.net/gitgo?retryWrites=true&w=majority&appName=Cluster0
```

### Check:
- ✅ Username: `jamdadeabhishek039`
- ✅ Password: `R1RKwuYdIpBaxPck`
- ✅ Cluster: `cluster0.uqicqbb.mongodb.net`
- ✅ Database: `gitgo`

### Get New Connection String:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Update `.env` file

---

## Solution 4: Check Firewall/Network

Your network or firewall might be blocking MongoDB connections.

### Test Connection:

```bash
# Test if you can reach MongoDB Atlas
ping cluster0.uqicqbb.mongodb.net

# Test MongoDB port
nc -zv cluster0.uqicqbb.mongodb.net 27017
```

### Common Blockers:
- Corporate firewall
- VPN restrictions
- ISP blocking
- Antivirus software

### Solutions:
- Disable VPN temporarily
- Try different network (mobile hotspot)
- Contact IT department if on corporate network
- Add MongoDB to firewall exceptions

---

## Solution 5: Update MongoDB Driver

Ensure you have the latest MongoDB driver.

```bash
npm install mongoose@latest mongodb@latest
```

---

## Solution 6: Use Local MongoDB (Development)

For development, you can use a local MongoDB instance.

### Install MongoDB Locally:

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Ubuntu/Debian:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Windows:**
Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

### Update .env:
```bash
MONGODB_URI=mongodb://localhost:27017/gitgo
```

---

## Quick Fix for Development

If you need to get the app running quickly without MongoDB:

### Option 1: Mock Data
The app now has fallback data when MongoDB is unavailable. The overview page will show:
- 10,000 repos (fallback)
- 5,000 good first issues (fallback)
- 200 GSoC orgs (fallback)

### Option 2: Skip MongoDB Features
Comment out MongoDB-dependent features temporarily:
- Repository sync pipeline
- Cached repository data
- User analytics

---

## Verify Connection

After applying fixes, test the connection:

```bash
# Restart dev server
npm run dev

# Check logs for:
# "[MongoDB] Connected successfully"
```

---

## Still Having Issues?

### Check MongoDB Atlas Status:
- [MongoDB Status Page](https://status.mongodb.com/)

### Get Help:
1. Check MongoDB Atlas logs
2. Review Network Access settings
3. Verify cluster is running
4. Check database user permissions

### Contact Support:
- MongoDB Atlas Support: https://support.mongodb.com
- MongoDB Community Forums: https://www.mongodb.com/community/forums

---

## Prevention

### For Production:

1. **Use Connection Pooling**: Already configured in `lib/mongodb.ts`
2. **Set Timeouts**: Already configured (10s server selection, 45s socket)
3. **Whitelist IPs**: Use specific IPs, not 0.0.0.0/0
4. **Monitor**: Set up MongoDB Atlas alerts
5. **Backup**: Enable automated backups

### For Development:

1. **Whitelist 0.0.0.0/0**: Allow all IPs
2. **Keep Cluster Active**: Don't let it pause
3. **Use Local MongoDB**: For offline development
4. **Cache Data**: Reduce database calls

---

## Current App Behavior

The app now handles MongoDB connection failures gracefully:

✅ **Overview Page**: Shows fallback stats
✅ **API Endpoints**: Return fallback data instead of errors
✅ **Error Logging**: Detailed error messages in console
✅ **User Experience**: App remains functional

---

## Summary

**Most likely cause**: IP address not whitelisted in MongoDB Atlas

**Quick fix**: 
1. Go to MongoDB Atlas → Network Access
2. Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
3. Wait 1-2 minutes
4. Restart dev server

**Long-term solution**: Use specific IP addresses for production
