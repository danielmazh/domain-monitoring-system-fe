FROM nginx:alpine

# Remove the default website config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy the static frontend into nginx's web root
COPY . /usr/share/nginx/html

EXPOSE 80
    