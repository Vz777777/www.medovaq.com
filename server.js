// server.js
// Production-grade B2B Express server for Medovaq Medical website

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const upload = multer(); // Configured to parse multipart/form-data (FormData) from the contact form

// Setup storage engine for local blog image uploads
const blogStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'images', 'blogs');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'blog-' + uniqueSuffix + ext);
    }
});
const uploadBlogImage = multer({ storage: blogStorage });

// Ensure directory layout exists on bootstrap
if (!fs.existsSync(path.join(__dirname, 'images', 'blogs'))) {
    fs.mkdirSync(path.join(__dirname, 'images', 'blogs'), { recursive: true });
    console.log('Initialized dynamic local upload folder: images/blogs/');
}

// ==========================================
// Middleware Configuration
// ==========================================
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static resources (CSS, JS, Images, data) directly
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Ensure dynamic JSON databases exist in the data/ folder
const ensureDataFileExists = (filename, defaultContent = '[]') => {
    const filePath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(filePath)) {
        // Create parent directories if they don't exist
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        fs.writeFileSync(filePath, defaultContent, 'utf8');
        console.log(`Initialized persistent database file: data/${filename}`);
    }
};
ensureDataFileExists('blogs.json');
ensureDataFileExists('submissions.json');
ensureDataFileExists('newsletter.json');

// Initialize empty CSV submissions database file if not present
const csvSubmissionsPath = path.join(__dirname, 'data', 'submissions.csv');
if (!fs.existsSync(csvSubmissionsPath)) {
    const csvHeaders = 'ID,Timestamp,Full Name,Email,Phone,Country,Address,Message\n';
    fs.writeFileSync(csvSubmissionsPath, csvHeaders, 'utf8');
    console.log('Initialized persistent CSV spreadsheet file: data/submissions.csv');
}

// Helper to append a submission to the CSV file safely (escaped fields)
const appendToCsv = (submission) => {
    const escapeCsv = (val) => {
        if (val === undefined || val === null) return '""';
        let str = String(val).replace(/"/g, '""'); // Escape inner double quotes
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            return `"${str}"`;
        }
        return str;
    };

    const row = [
        escapeCsv(submission.id),
        escapeCsv(submission.timestamp),
        escapeCsv(submission.full_name),
        escapeCsv(submission.email),
        escapeCsv(submission.phone),
        escapeCsv(submission.country),
        escapeCsv(submission.address),
        escapeCsv(submission.message)
    ].join(',') + '\n';

    fs.appendFileSync(csvSubmissionsPath, row, 'utf8');
    console.log(`[Database Server] Saved B2B lead ${submission.id} to CSV spreadsheet.`);
};


// ==========================================
// Clean SEO Frontend Routes
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/about.html', (req, res) => {
    res.redirect(301, '/about');
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'products.html'));
});

app.get('/products.html', (req, res) => {
    res.redirect(301, '/products');
});

app.get('/blogs', (req, res) => {
    const blogsPath = path.join(__dirname, 'data', 'blogs.json');
    fs.readFile(blogsPath, 'utf8', (err, data) => {
        if (err) return res.sendFile(path.join(__dirname, 'blogs.html'));
        try {
            const blogs = JSON.parse(data);
            let template = fs.readFileSync(path.join(__dirname, 'blogs.html'), 'utf8');
            
            // 1. Compile Pre-rendered HTML Blog Cards for crawlers
            let blogGridHtml = '';
            blogs.forEach(blog => {
                blogGridHtml += `
                    <article class="blog-card blog-dyn gsap-fade-up" style="opacity: 0; transform: translateY(50px);">
                        <img loading="lazy" src="${blog.image}" class="blog-image" alt="${blog.title}" onerror="this.src='/images/placeholder.jpg'">
                        <div class="blog-content">
                            <span class="blog-date">${blog.date}</span>
                            <h3 class="blog-title">${blog.title}</h3>
                            <p style="font-size: 0.9rem; color: var(--secondary); margin-bottom: 24px;">${blog.description}</p>
                            <a href="/blog/${blog.id}" class="blog-link">View Full Guide <i class="fa-solid fa-arrow-right"></i></a>
                        </div>
                    </article>
                `;
            });
            
            // Replace matching div with our pre-rendered cards
            template = template.replace(/<div id="dynamic-blog-grid" class="blog-grid"[^>]*>([\s\S]*?)<\/div>/, `<div id="dynamic-blog-grid" class="blog-grid" style="max-width: 1000px; margin: 0 auto; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));">${blogGridHtml}</div>`);
            
            // 2. Compile Dynamic JSON-LD Schema Graph for AI engines / Search crawlers
            const schemaGraph = {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Blog",
                        "@id": "https://www.medovaq.com/blogs#blog",
                        "name": "Medovaq Medical Insights",
                        "description": "Expert technical blogs and clinical insights on surgical-grade metal handling, sterilization processes, and B2B medical supply chains.",
                        "url": "https://www.medovaq.com/blogs",
                        "publisher": {
                            "@type": "MedicalOrganization",
                            "name": "Medovaq",
                            "logo": "https://www.medovaq.com/images/logo.png"
                        }
                    },
                    ...blogs.map(blog => {
                        let isoDate = new Date().toISOString();
                        try {
                            if (blog.date) {
                                const d = new Date(blog.date);
                                if (!isNaN(d)) isoDate = d.toISOString();
                            }
                        } catch (e) {}
                        
                        return {
                            "@type": "BlogPosting",
                            "@id": `https://www.medovaq.com/blog/${blog.id}#posting`,
                            "headline": blog.title,
                            "description": blog.description,
                            "image": blog.image.startsWith('http') ? blog.image : `https://www.medovaq.com${blog.image}`,
                            "datePublished": isoDate.split('T')[0] + 'T08:00:00+00:00',
                            "author": {
                                "@type": "Organization",
                                "name": "Medovaq"
                            },
                            "publisher": {
                                "@type": "MedicalOrganization",
                                "name": "Medovaq"
                            },
                            "mainEntityOfPage": `https://www.medovaq.com/blog/${blog.id}`
                        };
                    })
                ]
            };
            
            template = template.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(schemaGraph, null, 2)}</script>`);
            
            res.send(template);
        } catch (parseErr) {
            console.error('Blogs dynamic pre-render compiler error:', parseErr);
            res.sendFile(path.join(__dirname, 'blogs.html'));
        }
    });
});

// dynamic XML sitemap for Search Engine Indexing (Google Search Console compliance)
app.get('/sitemap.xml', (req, res) => {
    const blogsPath = path.join(__dirname, 'data', 'blogs.json');
    fs.readFile(blogsPath, 'utf8', (err, data) => {
        let blogs = [];
        if (!err) {
            try { blogs = JSON.parse(data); } catch (e) {}
        }
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        // Static routes
        const routes = [
            { path: '/', freq: 'weekly', pri: '1.0' },
            { path: '/about', freq: 'monthly', pri: '0.8' },
            { path: '/products', freq: 'weekly', pri: '0.9' },
            { path: '/blogs', freq: 'weekly', pri: '0.7' },
            { path: '/contact', freq: 'monthly', pri: '0.9' },
            { path: '/privacy', freq: 'monthly', pri: '0.3' },
            { path: '/terms', freq: 'monthly', pri: '0.3' }
        ];
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        routes.forEach(r => {
            xml += `    <url>\n`;
            xml += `        <loc>https://www.medovaq.com${r.path}</loc>\n`;
            xml += `        <lastmod>${todayStr}</lastmod>\n`;
            xml += `        <changefreq>${r.freq}</changefreq>\n`;
            xml += `        <priority>${r.pri}</priority>\n`;
            xml += `    </url>\n`;
        });
        
        // Dynamic blog routes
        blogs.forEach(blog => {
            let lastmod = todayStr;
            try {
                if (blog.date) {
                    const parsedDate = new Date(blog.date);
                    if (!isNaN(parsedDate)) {
                        lastmod = parsedDate.toISOString().split('T')[0];
                    }
                }
            } catch (e) {}
            
            xml += `    <url>\n`;
            xml += `        <loc>https://www.medovaq.com/blog/${blog.id}</loc>\n`;
            xml += `        <lastmod>${lastmod}</lastmod>\n`;
            xml += `        <changefreq>monthly</changefreq>\n`;
            xml += `        <priority>0.6</priority>\n`;
            xml += `    </url>\n`;
        });
        
        xml += `</urlset>\n`;
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    });
});

app.get('/blogs.html', (req, res) => {
    res.redirect(301, '/blogs');
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/contact.html', (req, res) => {
    res.redirect(301, '/contact');
});

// clean SEO administrative routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// dynamic dynamic compiled blog detail pages
app.get('/blog/:id', (req, res) => {
    const id = req.params.id;
    const blogsPath = path.join(__dirname, 'data', 'blogs.json');
    fs.readFile(blogsPath, 'utf8', (err, data) => {
        if (err) return res.redirect('/blogs');
        try {
            const blogs = JSON.parse(data);
            const blog = blogs.find(b => b.id.toString() === id.toString());
            if (!blog) return res.redirect('/blogs');
            
            // Read blog-detail.html template
            let template = fs.readFileSync(path.join(__dirname, 'blog-detail.html'), 'utf8');
            
            // Replace placeholders
            template = template.replace(/{{BLOG_TITLE}}/g, blog.title);
            template = template.replace(/{{BLOG_DATE}}/g, blog.date);
            template = template.replace(/{{BLOG_IMAGE}}/g, blog.image);
            template = template.replace(/{{BLOG_DESCRIPTION}}/g, blog.description);
            
            // Dynamic text content formatting
            let formattedContent = blog.content || blog.description;
            if (!formattedContent.includes('<p>') && !formattedContent.includes('<h2')) {
                formattedContent = formattedContent.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
            }
            template = template.replace(/{{BLOG_CONTENT}}/g, formattedContent);
            
            res.send(template);
        } catch (e) {
            console.error('Template compiler error:', e);
            res.redirect('/blogs');
        }
    });
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});

app.get('/privacy.html', (req, res) => {
    res.redirect(301, '/privacy');
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});

app.get('/terms.html', (req, res) => {
    res.redirect(301, '/terms');
});

// ==========================================
// REST API Endpoint: GET Blogs
// ==========================================
app.get('/api/blogs', (req, res) => {
    const blogsPath = path.join(__dirname, 'data', 'blogs.json');
    fs.readFile(blogsPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading blogs.json database:', err);
            return res.status(500).json({ error: 'Failed to retrieve blogs.' });
        }
        try {
            const blogs = JSON.parse(data);
            res.json(blogs);
        } catch (parseErr) {
            console.error('Error parsing blogs database:', parseErr);
            res.status(500).json({ error: 'Database parser error.' });
        }
    });
});

// ==========================================
// Administration Security & Middleware
// ==========================================
const checkAdminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized operational access.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = Buffer.from(token, 'base64').toString('ascii');
        const [role, password, expiry] = decoded.split(':');
        const expectedPassword = process.env.ADMIN_PASSWORD || 'login777';
        
        if (role === 'admin' && password === expectedPassword && parseInt(expiry) > Date.now()) {
            return next();
        }
        return res.status(401).json({ success: false, error: 'Invalid or expired administrative token.' });
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Token validation failure.' });
    }
};

// ==========================================
// REST API Endpoint: POST admin login check
// ==========================================
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const expectedPassword = process.env.ADMIN_PASSWORD || 'login777';
    
    if (password === expectedPassword) {
        // Return structured base64 token valid for 24 hours
        const expiry = Date.now() + (24 * 60 * 60 * 1000);
        const token = Buffer.from(`admin:${expectedPassword}:${expiry}`).toString('base64');
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid operational password.' });
    }
});

// ==========================================
// REST API Endpoint: GET download submissions CSV spreadsheet
// ==========================================
app.get('/api/admin/submissions/download', checkAdminAuth, (req, res) => {
    try {
        if (!fs.existsSync(csvSubmissionsPath)) {
            const csvHeaders = 'ID,Timestamp,Full Name,Email,Phone,Country,Address,Message\n';
            fs.writeFileSync(csvSubmissionsPath, csvHeaders, 'utf8');
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="medovaq_submissions_sheet.csv"');
        res.sendFile(csvSubmissionsPath);
    } catch (err) {
        console.error('Error downloading CSV submissions database:', err);
        res.status(500).json({ success: false, error: 'Database file compilation failed.' });
    }
});


// ==========================================
// REST API Endpoint: POST publish new blog
// ==========================================
app.post('/api/blogs', checkAdminAuth, uploadBlogImage.single('blogImage'), (req, res) => {
    try {
        const { title, date, description, content, imageMode, imageUrl } = req.body;
        
        if (!title || !date || !description || !content || !imageMode) {
            return res.status(400).json({ success: false, error: 'All composed fields are required.' });
        }

        let image = '';
        if (imageMode === 'url') {
            if (!imageUrl) {
                return res.status(400).json({ success: false, error: 'Image URL is required in URL mode.' });
            }
            image = imageUrl;
        } else {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Local file upload is missing.' });
            }
            image = `/images/blogs/${req.file.filename}`;
        }

        const blogsPath = path.join(__dirname, 'data', 'blogs.json');
        const rawData = fs.readFileSync(blogsPath, 'utf8');
        const blogs = JSON.parse(rawData);

        // Generate auto-incrementing numerical ID
        const newId = blogs.length > 0 ? Math.max(...blogs.map(b => parseInt(b.id) || 0)) + 1 : 1;

        const newBlog = {
            id: newId,
            title,
            date,
            image,
            description,
            content,
            link: `/blog/${newId}`
        };

        // Prepend so latest blogs load at the top
        blogs.unshift(newBlog);
        fs.writeFileSync(blogsPath, JSON.stringify(blogs, null, 2), 'utf8');
        
        console.log(`[Database Server] Composed blog ${newId} published successfully.`);
        res.json({ success: true, blog: newBlog });
    } catch (err) {
        console.error('ServerError in POST /api/blogs:', err);
        res.status(500).json({ success: false, error: 'Server error publishing article.' });
    }
});

// ==========================================
// REST API Endpoint: DELETE remove a blog
// ==========================================
app.delete('/api/blogs/:id', checkAdminAuth, (req, res) => {
    try {
        const id = req.params.id;
        const blogsPath = path.join(__dirname, 'data', 'blogs.json');
        const rawData = fs.readFileSync(blogsPath, 'utf8');
        const blogs = JSON.parse(rawData);

        const filteredBlogs = blogs.filter(b => b.id.toString() !== id.toString());
        
        if (filteredBlogs.length === blogs.length) {
            return res.status(404).json({ success: false, error: 'Article not found.' });
        }

        fs.writeFileSync(blogsPath, JSON.stringify(filteredBlogs, null, 2), 'utf8');
        console.log(`[Database Server] Deleted blog ${id} successfully.`);
        res.json({ success: true, message: `Article ${id} deleted.` });
    } catch (err) {
        console.error('ServerError in DELETE /api/blogs:', err);
        res.status(500).json({ success: false, error: 'Server error deleting article.' });
    }
});

// ==========================================
// REST API Endpoint: POST B2B RFQ submissions
// ==========================================
// Combines JSON and Multipart Form-Data (FormData) capabilities
app.post('/api/contact', upload.none(), async (req, res) => {
    try {
        const { full_name, email, phone, country, address, message } = req.body;

        // Basic Backend Validation
        if (!full_name || !email || !phone || !country || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Required inquiry fields are missing. Please complete the form.' 
            });
        }

        const submissionId = 'RFQ-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
        const timestamp = new Date().toISOString();

        const submissionData = {
            id: submissionId,
            timestamp,
            full_name,
            email,
            phone,
            country,
            address: address || 'N/A',
            message
        };

        // 1. Persist submission to CSV spreadsheet database synchronously
        appendToCsv(submissionData);

        // 2. Persist submission to submissions.json local database asynchronously
        const submissionsPath = path.join(__dirname, 'data', 'submissions.json');
        
        fs.readFile(submissionsPath, 'utf8', (err, rawData) => {
            if (err) {
                console.error('[Database Error] Failed to read submissions list:', err);
                return;
            }
            try {
                const submissions = JSON.parse(rawData);
                submissions.push(submissionData);
                fs.writeFile(submissionsPath, JSON.stringify(submissions, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('[Database Error] Failed to save B2B lead:', writeErr);
                    } else {
                        console.log(`[Database Server] Saved B2B lead ${submissionId} successfully.`);
                    }
                });
            } catch (parseErr) {
                console.error('[Database Error] Parser failure:', parseErr);
            }
        });

        // 2. SMTP Transactional Mailer (Only runs if environment credentials exist)
        const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

        if (isSmtpConfigured) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: parseInt(process.env.SMTP_PORT) === 465, // True for port 465, false for others
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            // Email 1: Alert Medovaq Sales Team
            const salesMailOptions = {
                from: process.env.SMTP_FROM || 'sales@medovaq.com',
                to: process.env.RECEIVER_EMAIL || 'leads@medovaq.com',
                subject: `🚨 [NEW B2B LEAD] Request for Quote - ${submissionId}`,
                text: `
Medovaq Lead Generation Portal - RFQ Submission
ID: ${submissionId}
Timestamp: ${timestamp}

Client Details:
------------------------------------------
Name: ${full_name}
Email: ${email}
Phone: ${phone}
Country: ${country}
Address: ${address || 'N/A'}

Inquiry Message:
------------------------------------------
${message}
                `,
                html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <div style="background-color: #0f172a; color: white; padding: 24px; text-align: center;">
    <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase;">New B2B Lead Alert</h2>
    <span style="font-size: 12px; opacity: 0.8; font-weight: bold;">ID: ${submissionId}</span>
  </div>
  <div style="padding: 24px;">
    <p>A new global request for quote has been submitted via the website.</p>
    
    <h3 style="color: #2563eb; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Lead Information</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; font-weight: bold; width: 30%;">Full Name:</td><td style="padding: 8px 0;">${full_name}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">${phone}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Country:</td><td style="padding: 8px 0;">${country}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Address:</td><td style="padding: 8px 0;">${address || 'N/A'}</td></tr>
      <tr><td style="padding: 8px 0; font-weight: bold;">Time:</td><td style="padding: 8px 0; font-size: 12px; color: #475569;">${timestamp}</td></tr>
    </table>
    
    <h3 style="color: #2563eb; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 24px;">Client Inquiry / Message</h3>
    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; font-style: italic; white-space: pre-wrap;">${message}</div>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #475569;">
    This is an automated sales alert generated by the Medovaq dynamic server.
  </div>
</div>
                `
            };

            // Email 2: Auto-Response back to Client (Premium Look)
            const clientMailOptions = {
                from: process.env.SMTP_FROM || 'sales@medovaq.com',
                to: email,
                subject: `Thank you for contacting Medovaq - Quote Request ${submissionId}`,
                text: `
Dear ${full_name},

Thank you for submitting a Request for Quote. We have successfully received your inquiry under reference ID: ${submissionId}.

A Medovaq representative will reach out to you within 24 business hours.

Best Regards,
Medovaq Ltd.
                `,
                html: `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <div style="background-color: #0f172a; color: white; padding: 28px 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em;">Medovaq<span style="color: #2563eb; margin-left: 2px;">■</span></h1>
    <span style="font-size: 11px; opacity: 0.8; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;">Medical Supplies & Surgical Instruments</span>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 16px; font-weight: bold;">Hello ${full_name},</p>
    <p>Thank you for submitting a Request for Quote. We have received your inquiry under reference ID: <strong>${submissionId}</strong>.</p>
    
    <p>A Medovaq representative will reach out to you within 24 business hours with custom wholesale pricing, packing dimensions, and delivery parameters.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <h4 style="margin: 0 0 10px 0; color: #2563eb; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Your Submission Details</h4>
      <p style="margin: 0; font-size: 13px;"><strong>Products/Inquiry:</strong></p>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569; font-style: italic;">"${message.length > 100 ? message.substring(0, 100) + '...' : message}"</p>
    </div>
    
    <p style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
      Best Regards,<br>
      <strong>Medovaq Ltd.</strong>
    </p>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #475569;">
    &copy; 2026 Medovaq. Global Supplies, Uncompromised Reliability.
  </div>
</div>
                `
            };

            // Dispatch emails asynchronously in parallel without blocking client response!
            transporter.sendMail(salesMailOptions)
                .then(() => console.log(`[SMTP Mailer] B2B lead alert email sent for ID: ${submissionId}`))
                .catch(mailErr => console.error(`[SMTP Mailer Alert Error] Failed to send lead alert for ID: ${submissionId}:`, mailErr));
            
            transporter.sendMail(clientMailOptions)
                .then(() => console.log(`[SMTP Mailer] Client confirmation receipt email sent for ID: ${submissionId}`))
                .catch(mailErr => console.error(`[SMTP Mailer Client Error] Failed to send client receipt for ID: ${submissionId}:`, mailErr));
        } else {
            console.warn(`[SMTP Sandbox Warning] SMTP credentials are blank in .env. Submissions are stored locally, but no alert emails were dispatched.`);
        }

        // Return HTTP response INSTANTLY!
        res.status(200).json({ 
            success: true, 
            message: 'Your B2B quote request has been stored successfully.',
            referenceId: submissionId
        });

    } catch (err) {
        console.error('ServerError in /api/contact:', err);
        res.status(500).json({ 
            success: false, 
            error: 'A backend server error occurred while processing your quote.' 
        });
    }
});

// ==========================================
// REST API Endpoint: POST Newsletter Subscriptions
// ==========================================
app.post('/api/newsletter', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid or missing email address.' 
            });
        }

        const id = 'NEWS-' + Date.now().toString(36).toUpperCase();
        const timestamp = new Date().toISOString();

        const newsletterPath = path.join(__dirname, 'data', 'newsletter.json');
        const rawData = fs.readFileSync(newsletterPath, 'utf8');
        const list = JSON.parse(rawData);

        // Deduplication check
        const alreadyExists = list.some(sub => sub.email.toLowerCase() === email.toLowerCase());
        if (alreadyExists) {
            return res.status(200).json({ 
                success: true, 
                message: 'You have already subscribed to the Medovaq Newsletter!' 
            });
        }

        list.push({ id, timestamp, email });
        fs.writeFileSync(newsletterPath, JSON.stringify(list, null, 2), 'utf8');
        console.log(`[Database Server] Registered newsletter subscriber: ${email}`);

        res.status(200).json({ 
            success: true, 
            message: 'Thank you for joining the Medovaq mailing list.' 
        });

    } catch (err) {
        console.error('ServerError in /api/newsletter:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Server error registering subscription.' 
        });
    }
});

// ==========================================
// 404 Fallback Route for unmatched dynamic requests
// ==========================================
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html')); // Fallback gracefully to homepage
});

// Start the operations desk
app.listen(PORT, () => {
    console.log(`\n==========================================`);
    console.log(`🟢 MEDOVAQ B2B BACKEND IS OPERATIONAL!`);
    console.log(`🚀 Port:         http://localhost:${PORT}`);
    console.log(`📦 Database:     Local JSON persist (data/)`);
    console.log(`==========================================\n`);
});
