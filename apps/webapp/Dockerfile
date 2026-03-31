FROM gitea.nilbyte.com.br/nilbyte-studios/mirante/base/nginx:alpine

COPY apps/webapp/dist /usr/share/nginx/html
COPY apps/webapp/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
