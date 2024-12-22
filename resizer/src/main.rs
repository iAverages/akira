use std::io::{BufReader, BufWriter, Cursor};

use axum::body::Body;
use axum::extract::Path;
use axum::response::{AppendHeaders, IntoResponse};
use axum::routing::get;
use axum::Router;
use fast_image_resize::{IntoImageView, Resizer};
use image::codecs::png::PngEncoder;
use image::{DynamicImage, ImageEncoder, ImageReader};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new().route("/*path", get(root));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

use fast_image_resize::images::Image;
use reqwest::header;
use tokio::time::Instant;
use tokio_util::io::ReaderStream;

struct RemoteImage {
    pub image: DynamicImage,
}

impl RemoteImage {
    async fn from_url(url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        let response = reqwest::get(url)
            .await
            .expect("failed to send http request");

        let bytes = response.bytes().await.expect("failed to get image bytes");
        let duration = start_time.elapsed();
        println!("took(fetch): {:?}", duration);

        let start_time = Instant::now();

        let image_reader =
            ImageReader::new(BufReader::new(Cursor::new(bytes))).with_guessed_format()?;
        let image = image_reader.decode()?;

        let duration = start_time.elapsed();
        println!("took(decode): {:?}", duration);
        Ok(RemoteImage { image })
    }
}

async fn root(Path(path): Path<String>) -> impl IntoResponse {
    let remote_image =
        RemoteImage::from_url(&("https://cdn.danielraybone.com/".to_owned() + &path))
            .await
            .expect("failed to send image request");

    let dst_width = 253;
    let dst_height = 143;
    let mut dst_image = Image::new(
        dst_width,
        dst_height,
        remote_image
            .image
            .pixel_type()
            .expect("failed to get pixel type"),
    );

    let start_time = Instant::now();

    let mut resizer = Resizer::new();
    resizer
        .resize(&remote_image.image, &mut dst_image, None)
        .expect("failed to resize");

    let duration = start_time.elapsed();
    println!("took(resize): {:?}", duration);

    let start_time = Instant::now();
    let mut result_buf = BufWriter::new(Vec::new());
    PngEncoder::new(&mut result_buf)
        .write_image(
            dst_image.buffer(),
            dst_width,
            dst_height,
            remote_image.image.color().into(),
        )
        .unwrap();

    let duration = start_time.elapsed();
    println!("took(encode): {:?}", duration);

    let stream = ReaderStream::new(Cursor::new(
        result_buf.into_inner().expect("failed to get inner vec"),
    ));
    let body = Body::from_stream(stream);

    let headers = AppendHeaders([
        (header::CONTENT_TYPE, "image/png"),
        (header::CONTENT_DISPOSITION, "inline; filename=\"cum.png\""),
        (header::TRANSFER_ENCODING, "chunked"),
        (header::CACHE_CONTROL, "max-age=31536000, public"),
    ]);

    (headers, body)
}
