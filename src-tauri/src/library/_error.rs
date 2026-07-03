use std::io::{Error, ErrorKind};

#[allow(dead_code)]
pub fn io_error_maker(kind: ErrorKind, message: &str) -> Error {
    Error::new(kind, message)
}