# Daywell frontend

Responsive React frontend for the Leave Management System. The app includes employee sign-up and leave requests, manager review, and admin reporting.

## Run locally

```sh
npm install
npm run dev
```

By default, API requests go to `http://localhost:5000`. To use another backend URL, create a `.env` file in this folder:

```env
VITE_API_URL=http://localhost:5000
```

The backend must provide the `/api/auth`, `/api/leaves`, and `/api/admin/report` routes. The frontend stores only the login token and role in local storage and sends the token as a bearer credential for authenticated API calls.

## Checks

```sh
npm run lint
npm run build
```
